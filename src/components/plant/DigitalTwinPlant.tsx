import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ExternalLink,
  AlertOctagon,
  StepForward,
  Repeat,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type GemmaMode = 'AU' | 'CL' | 'ET' | 'MAN';
export type PlantMode = 'conveyor' | 'tank' | 'pneumatic' | 'bottling';
type LocalPneumaticPhase = 'idle' | 'extending' | 'dwell_end' | 'retracting' | 'dwell_start';
type BottlingStage =
  | 'E0'
  | 'E1'
  | 'E3'
  | 'E4'
  | 'E8'
  | 'E9'
  | 'E12'
  | 'E13'
  | 'E14'
  | 'E15'
  | 'E16'
  | 'E17';

interface BottleSlot {
  fillLevel: number;
  isCapped: boolean;
}

interface BottlingState {
  stage: BottlingStage;
  cylA: number;
  cylB: number;
  cylC: number;
  valveD: boolean;
  cylE: number;
  motorF: boolean;
  cylG: number;
  screwAngle: number;
  screwTicks: number;
  slot1: BottleSlot | null;
  slot2: BottleSlot | null;
  slot3: BottleSlot | null;
}

interface ManualBottlingTargets {
  cylA: boolean;
  cylB: boolean;
  cylC: boolean;
  valveD: boolean;
  cylE: boolean;
  motorF: boolean;
  cylG: boolean;
}

interface Props {
  simulationState: SimulationState;
  document?: CircuitDocument;
  onPressButton: (buttonTag: string, isPressed: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  embeddedMode?: boolean;
  onLoadExample?: (exampleId: string) => void;
  gemmaMode?: GemmaMode;
  emergencyStop?: boolean;
  gemmaStateCode?: string;
  onSetGemmaMode?: (mode: GemmaMode) => void;
  onToggleEmergencyStop?: () => void;
  onTriggerRearm?: () => void;
  onTriggerCyclePulse?: () => void;
  onTriggerStepPulse?: () => void;
  onStopPlant?: () => void;
  controlledPlantMode?: PlantMode;
  onPlantModeChange?: (mode: PlantMode) => void;
}

const createInitialBottlingState = (): BottlingState => ({
  stage: 'E0',
  cylA: 0,
  cylB: 0,
  cylC: 0,
  valveD: false,
  cylE: 0,
  motorF: false,
  cylG: 0,
  screwAngle: 0,
  screwTicks: 0,
  slot1: { fillLevel: 0, isCapped: false },
  slot2: { fillLevel: 100, isCapped: false },
  slot3: null
});

const INITIAL_MANUAL_TARGETS: ManualBottlingTargets = {
  cylA: false,
  cylB: false,
  cylC: false,
  valveD: false,
  cylE: false,
  motorF: false,
  cylG: false
};

const BOTTLING_STAGE_LABELS: Record<BottlingStage, string> = {
  E0: 'Reposo',
  E1: 'B+ Avance',
  E3: 'A+ Carga / B-',
  E4: 'A- Retorno',
  E8: 'C+ / D+ Llenado',
  E9: 'C- Sube Boq.',
  E12: 'G+ Tapón',
  E13: 'E+ Coloca',
  E14: 'E- Sube',
  E15: 'G- Retira',
  E16: 'E+ / F+ Rosca',
  E17: 'E- Fin Ciclo'
};

export const DigitalTwinPlant: React.FC<Props> = ({
  simulationState,
  document,
  onPressButton,
  isOpen,
  onClose,
  embeddedMode = false,
  onLoadExample,
  gemmaMode,
  emergencyStop,
  gemmaStateCode,
  onSetGemmaMode,
  onToggleEmergencyStop,
  onTriggerRearm,
  onTriggerCyclePulse,
  onTriggerStepPulse,
  onStopPlant,
  controlledPlantMode,
  onPlantModeChange
}) => {
  const [plantMode, setPlantMode] = useState<PlantMode>(controlledPlantMode ?? 'conveyor');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const selectPlantMode = useCallback(
    (next: PlantMode) => {
      setPlantMode(next);
      onPlantModeChange?.(next);
    },
    [onPlantModeChange]
  );

  useEffect(() => {
    if (controlledPlantMode) {
      setPlantMode(controlledPlantMode);
    }
  }, [controlledPlantMode]);

  // Estado GEMMA local (fallback cuando no se pasan props externos)
  const [localGemmaMode, setLocalGemmaMode] = useState<GemmaMode>('AU');
  const [localEmergencyStop, setLocalEmergencyStop] = useState<boolean>(false);
  const [peAlertNotice, setPeAlertNotice] = useState<boolean>(false);
  const [isRearming, setIsRearming] = useState<boolean>(false);
  const [etWaiting, setEtWaiting] = useState<boolean>(false);

  const activeGemmaMode = gemmaMode ?? localGemmaMode;
  const isPE = emergencyStop ?? localEmergencyStop;

  // Latch estricto de marcha/paro de planta
  const [plantRunning, setPlantRunning] = useState<boolean>(false);
  const plantRunningRef = useRef<boolean>(false);
  const userStoppedRef = useRef<boolean>(true);
  const rearmingRef = useRef<boolean>(false);
  const clCycleActiveRef = useRef<boolean>(false);
  const etStepPendingRef = useRef<boolean>(false);
  const etWaitingRef = useRef<boolean>(false);

  // Estado compartido de animación continua (flujos, rodillos, impulsor)
  const [flowOffset, setFlowOffset] = useState<number>(0);
  const [rollerAngle, setRollerAngle] = useState<number>(0);
  const [pumpAngle, setPumpAngle] = useState<number>(0);

  // Modo 1: Cinta / Clasificadora
  const [boxPos, setBoxPos] = useState<number>(8);
  const [processedBoxes, setProcessedBoxes] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [diverterExtend, setDiverterExtend] = useState<number>(0);
  const [manConveyorOn, setManConveyorOn] = useState<boolean>(false);
  const [manDiverterOn, setManDiverterOn] = useState<boolean>(false);
  const manConveyorRef = useRef<boolean>(false);
  const manDiverterRef = useRef<boolean>(false);

  // Modo 2: Tanque + Bomba + Válvula Salida + Histéresis (Válvula inicia cerrada = false)
  const [tankLevel, setTankLevel] = useState<number>(20);
  const [drainValveOpen, setDrainValveOpen] = useState<boolean>(false);
  const [isQuickDraining, setIsQuickDraining] = useState<boolean>(false);
  const [tankHysteresisHold, setTankHysteresisHold] = useState<boolean>(false);
  const [manTankPumpOn, setManTankPumpOn] = useState<boolean>(false);
  const tankLevelRef = useRef<number>(20);
  const tankHysteresisRef = useRef<boolean>(false);
  const manTankPumpRef = useRef<boolean>(false);

  // Modo 3: Neumática (real o gemelo local sincronizado)
  const [pneumaticCycles, setPneumaticCycles] = useState<number>(0);
  const [localPistonPos, setLocalPistonPos] = useState<number>(0);
  const [localPneumaticPhase, setLocalPneumaticPhase] = useState<LocalPneumaticPhase>('idle');
  const [manPneumaticTarget, setManPneumaticTarget] = useState<'idle' | 'extend' | 'retract'>('idle');
  const localPosRef = useRef<number>(0);
  const localPhaseRef = useRef<LocalPneumaticPhase>('idle');
  const localDwellRef = useRef<number>(0);
  const wasAtEndRef = useRef<boolean>(false);
  const frozenRealPistonRef = useRef<number>(0);
  const manPneumaticTargetRef = useRef<'idle' | 'extend' | 'retract'>('idle');

  // Modo 4: Embotelladora GEMMA 5 Cilindros + 2 Válvulas
  const [bottling, setBottling] = useState<BottlingState>(createInitialBottlingState);
  const [bottledCount, setBottledCount] = useState<number>(0);
  const [manBottlingTargets, setManBottlingTargets] =
    useState<ManualBottlingTargets>(INITIAL_MANUAL_TARGETS);
  const bottlingRef = useRef<BottlingState>(createInitialBottlingState());
  const manBottlingTargetsRef = useRef<ManualBottlingTargets>(INITIAL_MANUAL_TARGETS);

  // Refs de botones Marcha / Paro
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-selección inteligente del modo de planta cuando cambia el circuito cargado
  const docTitle = document?.titleBlock?.title || '';
  const prevDocTitleRef = useRef<string>(docTitle);
  const docHasCylinder = Boolean(
    document?.components.some(c => c.type === 'pneumatic_cylinder_da')
  );

  useEffect(() => {
    if (!document) return;
    if (controlledPlantMode && prevDocTitleRef.current === docTitle) {
      return;
    }
    prevDocTitleRef.current = docTitle;
    const titleLower = docTitle.toLowerCase();

    if (titleLower.includes('embotell')) {
      selectPlantMode('bottling');
    } else if (titleLower.includes('tanque') || titleLower.includes('bomba')) {
      selectPlantMode('tank');
    } else if (
      titleLower.includes('neum') ||
      titleLower.includes('pist') ||
      (docHasCylinder &&
        !titleLower.includes('cinta') &&
        !titleLower.includes('banda') &&
        !titleLower.includes('embotell'))
    ) {
      selectPlantMode('pneumatic');
    } else {
      selectPlantMode('conveyor');
    }
  }, [document, docTitle, docHasCylinder, controlledPlantMode, selectPlantMode]);

  // Limpieza de temporizadores de pulsadores al desmontar
  useEffect(() => {
    return () => {
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  // Reset estricto de marcha cuando cambia simulationState.mode, plantMode o docTitle
  useEffect(() => {
    if (simulationState.mode === 'stopped') {
      plantRunningRef.current = false;
      setPlantRunning(false);
      userStoppedRef.current = true;
      clCycleActiveRef.current = false;
      etStepPendingRef.current = false;
      etWaitingRef.current = false;
      setEtWaiting(false);
      localPhaseRef.current = 'idle';
      setLocalPneumaticPhase('idle');
      setDrainValveOpen(false);
      setIsQuickDraining(false);
      manConveyorRef.current = false;
      setManConveyorOn(false);
      manDiverterRef.current = false;
      setManDiverterOn(false);
      manTankPumpRef.current = false;
      setManTankPumpOn(false);
      manPneumaticTargetRef.current = 'idle';
      setManPneumaticTarget('idle');
      manBottlingTargetsRef.current = { ...INITIAL_MANUAL_TARGETS };
      setManBottlingTargets({ ...INITIAL_MANUAL_TARGETS });
    }
  }, [simulationState.mode]);

  useEffect(() => {
    plantRunningRef.current = false;
    setPlantRunning(false);
    userStoppedRef.current = true;
    clCycleActiveRef.current = false;
    etStepPendingRef.current = false;
    etWaitingRef.current = false;
    setEtWaiting(false);
    localPhaseRef.current = 'idle';
    localPosRef.current = 0;
    setLocalPistonPos(0);
    setLocalPneumaticPhase('idle');
    frozenRealPistonRef.current = 0;
    setDrainValveOpen(false);
    setIsQuickDraining(false);
    setDiverterExtend(0);
    const freshBottling = createInitialBottlingState();
    bottlingRef.current = freshBottling;
    setBottling(freshBottling);
    manConveyorRef.current = false;
    setManConveyorOn(false);
    manDiverterRef.current = false;
    setManDiverterOn(false);
    manTankPumpRef.current = false;
    setManTankPumpOn(false);
    manPneumaticTargetRef.current = 'idle';
    setManPneumaticTarget('idle');
    manBottlingTargetsRef.current = { ...INITIAL_MANUAL_TARGETS };
    setManBottlingTargets({ ...INITIAL_MANUAL_TARGETS });
  }, [plantMode, docTitle]);

  // Si PE se activa desde prop externo, congelar todo inmediatamente
  useEffect(() => {
    if (isPE) {
      plantRunningRef.current = false;
      setPlantRunning(false);
      userStoppedRef.current = true;
      rearmingRef.current = false;
      setIsRearming(false);
      clCycleActiveRef.current = false;
      etStepPendingRef.current = false;
      etWaitingRef.current = false;
      setEtWaiting(false);
      localPhaseRef.current = 'idle';
      setLocalPneumaticPhase('idle');
      setDrainValveOpen(false);
      setIsQuickDraining(false);
      manConveyorRef.current = false;
      setManConveyorOn(false);
      manDiverterRef.current = false;
      setManDiverterOn(false);
      manTankPumpRef.current = false;
      setManTankPumpOn(false);
      manPneumaticTargetRef.current = 'idle';
      setManPneumaticTarget('idle');
      manBottlingTargetsRef.current = { ...INITIAL_MANUAL_TARGETS };
      setManBottlingTargets({ ...INITIAL_MANUAL_TARGETS });
    }
  }, [isPE]);

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

  // Compuertas estrictas por planta
  const canAnimate = isSimRunning && !isPE && !userStoppedRef.current;

  const isConveyorDriving =
    canAnimate &&
    (activeGemmaMode === 'MAN'
      ? manConveyorOn
      : isMotorRunning || plantRunning);

  const isTankPumpCommand =
    canAnimate &&
    (activeGemmaMode === 'MAN'
      ? manTankPumpOn
      : isMotorRunning ||
        plantRunning ||
        simulationState.activeCoils.has('PLC:%Q0.0') ||
        simulationState.activeCoils.has('-KM1') ||
        q01Active);

  const isLocalPneumaticDrive =
    canAnimate &&
    (activeGemmaMode === 'MAN'
      ? manPneumaticTarget !== 'idle'
      : isMotorRunning || realY1Active || realY2Active || q01Active || plantRunning);

  const isBottlingAutoDrive =
    canAnimate &&
    activeGemmaMode !== 'MAN' &&
    !rearmingRef.current &&
    (plantRunning ||
      clCycleActiveRef.current ||
      etStepPendingRef.current ||
      isMotorRunning ||
      realY1Active ||
      realY2Active ||
      q01Active);

  // Estado neumático real vs gemelo local sincronizado
  const firstPneumaticEntry =
    simulationState.pneumaticStates && simulationState.pneumaticStates.size > 0
      ? Array.from(simulationState.pneumaticStates.values())[0]
      : undefined;
  const hasRealPneumatic = Boolean(firstPneumaticEntry);

  if (hasRealPneumatic && canAnimate && activeGemmaMode !== 'MAN') {
    frozenRealPistonRef.current = firstPneumaticEntry?.position ?? 0;
  }

  const pistonPos = hasRealPneumatic
    ? canAnimate && activeGemmaMode !== 'MAN'
      ? (firstPneumaticEntry?.position ?? 0)
      : frozenRealPistonRef.current
    : localPistonPos;

  const reedA0 = pistonPos <= 0.04;
  const reedA1 = pistonPos >= 0.96;

  const y1Active = !canAnimate
    ? false
    : activeGemmaMode === 'MAN'
      ? manPneumaticTarget === 'extend'
      : hasRealPneumatic
        ? realY1Active
        : isLocalPneumaticDrive &&
          (localPneumaticPhase === 'extending' || localPneumaticPhase === 'dwell_end');

  const y2Active = !canAnimate
    ? false
    : activeGemmaMode === 'MAN'
      ? manPneumaticTarget === 'retract'
      : hasRealPneumatic
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
    plantMode,
    activeGemmaMode,
    isPE,
    isSimRunning,
    canAnimate,
    isConveyorDriving,
    isTankPumpCommand,
    isLocalPneumaticDrive,
    isBottlingAutoDrive,
    hasRealPneumatic,
    realY1Active,
    drainValveOpen,
    isQuickDraining,
    isRearming
  });

  liveRef.current = {
    plantMode,
    activeGemmaMode,
    isPE,
    isSimRunning,
    canAnimate,
    isConveyorDriving,
    isTankPumpCommand,
    isLocalPneumaticDrive,
    isBottlingAutoDrive,
    hasRealPneumatic,
    realY1Active,
    drainValveOpen,
    isQuickDraining,
    isRearming
  };

  const shouldTick = isSimRunning || isRearming;

  // Bucle maestro de simulación física 2D (~40 fps)
  useEffect(() => {
    if (!shouldTick) return;

    const interval = setInterval(() => {
      const s = liveRef.current;

      // Si PE está activo -> congelar TODO inmediatamente
      if (s.isPE) {
        return;
      }

      // REARME A6: retracción suave de todos los cilindros hacia 0%
      if (rearmingRef.current) {
        let stillHoming = false;

        if (localPosRef.current > 0.001) {
          localPosRef.current = Math.max(0, localPosRef.current - 0.075);
          setLocalPistonPos(localPosRef.current);
          stillHoming = true;
        }
        frozenRealPistonRef.current = Math.max(0, frozenRealPistonRef.current - 0.075);

        const cur = bottlingRef.current;
        const nextCylA = Math.max(0, cur.cylA - 0.075);
        const nextCylB = Math.max(0, cur.cylB - 0.075);
        const nextCylC = Math.max(0, cur.cylC - 0.075);
        const nextCylE = Math.max(0, cur.cylE - 0.075);
        const nextCylG = Math.max(0, cur.cylG - 0.075);

        if (
          nextCylA > 0.001 ||
          nextCylB > 0.001 ||
          nextCylC > 0.001 ||
          nextCylE > 0.001 ||
          nextCylG > 0.001
        ) {
          stillHoming = true;
          const nextState: BottlingState = {
            ...cur,
            cylA: nextCylA,
            cylB: nextCylB,
            cylC: nextCylC,
            cylE: nextCylE,
            cylG: nextCylG,
            valveD: false,
            motorF: false
          };
          bottlingRef.current = nextState;
          setBottling(nextState);
        } else {
          const resetBot = createInitialBottlingState();
          bottlingRef.current = resetBot;
          setBottling(resetBot);
        }

        setDiverterExtend(0);

        if (!stillHoming) {
          rearmingRef.current = false;
          setIsRearming(false);
        }
        return;
      }

      if (!s.isSimRunning) {
        return;
      }

      const bottlingMoving =
        s.plantMode === 'bottling' &&
        (s.isBottlingAutoDrive ||
          (s.activeGemmaMode === 'MAN' &&
            (manBottlingTargetsRef.current.valveD ||
              manBottlingTargetsRef.current.motorF ||
              manBottlingTargetsRef.current.cylA ||
              manBottlingTargetsRef.current.cylB ||
              manBottlingTargetsRef.current.cylC ||
              manBottlingTargetsRef.current.cylE ||
              manBottlingTargetsRef.current.cylG)));

      // Avance de flujos visuales (agua, aire comprimido, banda)
      if (
        s.isConveyorDriving ||
        s.isTankPumpCommand ||
        s.isLocalPneumaticDrive ||
        bottlingMoving ||
        (s.isQuickDraining && s.isSimRunning) ||
        (s.drainValveOpen && tankLevelRef.current > 15 && s.isSimRunning)
      ) {
        setFlowOffset(prev => (prev + 1.8) % 24);
      }

      // 1. CINTA / CLASIFICADORA
      if (s.isConveyorDriving) {
        setRollerAngle(prev => (prev + 8) % 360);
        setBoxPos(prev => {
          const next = prev + 0.55;
          const inSensor = next >= 54 && next <= 69;
          setSensorActive(inSensor);

          if (s.activeGemmaMode === 'MAN') {
            setDiverterExtend(manDiverterRef.current ? 0.9 : 0);
          } else if (next >= 65 && next <= 81) {
            const pulse = Math.sin(((next - 65) / 16) * Math.PI);
            setDiverterExtend(Math.max(0, Math.min(1, pulse)));
          } else {
            setDiverterExtend(s.realY1Active ? 0.85 : 0);
          }

          if (next >= 96) {
            setProcessedBoxes(b => b + 1);
            if (s.activeGemmaMode === 'CL' && clCycleActiveRef.current) {
              clCycleActiveRef.current = false;
              plantRunningRef.current = false;
              setPlantRunning(false);
            }
            return 5;
          }
          return next;
        });
      } else if (s.activeGemmaMode === 'MAN' && !userStoppedRef.current) {
        setDiverterExtend(manDiverterRef.current ? 0.9 : 0);
      } else {
        setDiverterExtend(0);
      }

      // 2. TANQUE + BOMBA + VÁLVULA DE SALIDA + HISTÉRESIS AUTOMÁTICA
      if (s.isQuickDraining && s.isSimRunning && !s.isPE) {
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
        if (s.drainValveOpen && currentLevel > 15 && s.isSimRunning && !s.isPE) {
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

      // 3. NEUMÁTICA A+ / A- (GEMELO LOCAL O MANUAL)
      if (!s.hasRealPneumatic || s.activeGemmaMode === 'MAN') {
        if (s.activeGemmaMode === 'MAN' && s.canAnimate) {
          const target = manPneumaticTargetRef.current;
          let pos = localPosRef.current;
          if (target === 'extend' && pos < 1) {
            pos = Math.min(1, pos + 0.045);
            localPosRef.current = pos;
            setLocalPistonPos(pos);
          } else if (target === 'retract' && pos > 0) {
            pos = Math.max(0, pos - 0.045);
            localPosRef.current = pos;
            setLocalPistonPos(pos);
          }
        } else if (s.isLocalPneumaticDrive) {
          let phase = localPhaseRef.current;
          let pos = localPosRef.current;

          if (phase === 'idle') {
            phase = pos >= 0.96 ? 'retracting' : 'extending';
            localPhaseRef.current = phase;
            setLocalPneumaticPhase(phase);
          }

          if (phase === 'extending') {
            pos = Math.min(1, pos + 0.036);
            localPosRef.current = pos;
            setLocalPistonPos(pos);
            if (pos >= 1) {
              if (s.activeGemmaMode === 'ET') {
                localPhaseRef.current = 'idle';
                setLocalPneumaticPhase('idle');
                etStepPendingRef.current = false;
                etWaitingRef.current = true;
                setEtWaiting(true);
                plantRunningRef.current = false;
                setPlantRunning(false);
              } else {
                localPhaseRef.current = 'dwell_end';
                localDwellRef.current = 7;
                setLocalPneumaticPhase('dwell_end');
              }
            }
          } else if (phase === 'dwell_end') {
            localDwellRef.current -= 1;
            if (localDwellRef.current <= 0) {
              localPhaseRef.current = 'retracting';
              setLocalPneumaticPhase('retracting');
            }
          } else if (phase === 'retracting') {
            pos = Math.max(0, pos - 0.036);
            localPosRef.current = pos;
            setLocalPistonPos(pos);
            if (pos <= 0) {
              if (s.activeGemmaMode === 'ET') {
                localPhaseRef.current = 'idle';
                setLocalPneumaticPhase('idle');
                etStepPendingRef.current = false;
                etWaitingRef.current = true;
                setEtWaiting(true);
                plantRunningRef.current = false;
                setPlantRunning(false);
              } else if (s.activeGemmaMode === 'CL' && clCycleActiveRef.current) {
                localPhaseRef.current = 'idle';
                setLocalPneumaticPhase('idle');
                clCycleActiveRef.current = false;
                plantRunningRef.current = false;
                setPlantRunning(false);
              } else {
                localPhaseRef.current = 'dwell_start';
                localDwellRef.current = 7;
                setLocalPneumaticPhase('dwell_start');
              }
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

      // 4. EMBOTELLADORA GEMMA 5 CILINDROS + 2 VÁLVULAS (E0 -> E17)
      if (s.activeGemmaMode === 'MAN' && s.canAnimate) {
        const cur = bottlingRef.current;
        const tgt = manBottlingTargetsRef.current;
        const stepCyl = (val: number, extend: boolean) =>
          extend ? Math.min(1, val + 0.06) : Math.max(0, val - 0.06);

        const nextCylA = stepCyl(cur.cylA, tgt.cylA);
        const nextCylB = stepCyl(cur.cylB, tgt.cylB);
        const nextCylC = stepCyl(cur.cylC, tgt.cylC);
        const nextCylE = stepCyl(cur.cylE, tgt.cylE);
        const nextCylG = stepCyl(cur.cylG, tgt.cylG);
        const nextScrew = tgt.motorF ? (cur.screwAngle + 28) % 360 : cur.screwAngle;

        let nextSlot2 = cur.slot2 ? { ...cur.slot2 } : null;
        if (tgt.valveD && nextSlot2 && nextSlot2.fillLevel < 100) {
          nextSlot2.fillLevel = Math.min(100, nextSlot2.fillLevel + 2.8);
        }

        const nextState: BottlingState = {
          ...cur,
          cylA: nextCylA,
          cylB: nextCylB,
          cylC: nextCylC,
          cylE: nextCylE,
          cylG: nextCylG,
          valveD: tgt.valveD,
          motorF: tgt.motorF,
          screwAngle: nextScrew,
          slot2: nextSlot2
        };

        bottlingRef.current = nextState;
        setBottling(nextState);
      } else if (s.isBottlingAutoDrive) {
        const cur = bottlingRef.current;

        // En ET, si estamos pausados esperando +1 Etapa, no avanzar hasta que llegue pulso
        if (s.activeGemmaMode === 'ET' && etWaitingRef.current && !etStepPendingRef.current) {
          return;
        }

        const next: BottlingState = {
          ...cur,
          slot1: cur.slot1 ? { ...cur.slot1 } : null,
          slot2: cur.slot2 ? { ...cur.slot2 } : null,
          slot3: cur.slot3 ? { ...cur.slot3 } : null
        };
        let stageCompleted = false;
        let completedCycle = false;

        const finishStage = (targetStage: BottlingStage) => {
          next.stage = targetStage;
          stageCompleted = true;
        };

        switch (cur.stage) {
          case 'E0': {
            next.cylA = 0;
            next.cylB = 0;
            next.cylC = 0;
            next.cylE = 0;
            next.cylG = 0;
            next.valveD = false;
            next.motorF = false;
            if (plantRunningRef.current || clCycleActiveRef.current || etStepPendingRef.current) {
              next.stage = 'E1';
            }
            break;
          }
          case 'E1': {
            next.cylB = Math.min(1, cur.cylB + 0.045);
            if (next.cylB >= 1) {
              next.slot3 = cur.slot2 ? { ...cur.slot2 } : null;
              next.slot2 = cur.slot1 ? { ...cur.slot1 } : null;
              next.slot1 = null;
              finishStage('E3');
            }
            break;
          }
          case 'E3': {
            next.cylA = Math.min(1, cur.cylA + 0.05);
            next.cylB = Math.max(0, cur.cylB - 0.05);
            if (next.cylA >= 1 && next.cylB <= 0) {
              next.slot1 = { fillLevel: 0, isCapped: false };
              finishStage('E4');
            }
            break;
          }
          case 'E4': {
            next.cylA = Math.max(0, cur.cylA - 0.055);
            if (next.cylA <= 0) {
              finishStage('E8');
            }
            break;
          }
          case 'E8': {
            if (cur.cylC < 1) {
              next.cylC = Math.min(1, cur.cylC + 0.06);
              next.valveD = next.cylC >= 0.85;
            } else {
              next.valveD = true;
              const targetSlot2 = next.slot2 ?? { fillLevel: 0, isCapped: false };
              targetSlot2.fillLevel = Math.min(100, targetSlot2.fillLevel + 3.2);
              next.slot2 = targetSlot2;
              if (targetSlot2.fillLevel >= 100) {
                next.valveD = false;
                finishStage('E9');
              }
            }
            break;
          }
          case 'E9': {
            next.valveD = false;
            next.cylC = Math.max(0, cur.cylC - 0.06);
            if (next.cylC <= 0) {
              finishStage('E12');
            }
            break;
          }
          case 'E12': {
            next.cylG = Math.min(1, cur.cylG + 0.06);
            if (next.cylG >= 1) {
              finishStage('E13');
            }
            break;
          }
          case 'E13': {
            next.cylE = Math.min(1, cur.cylE + 0.065);
            if (next.cylE >= 1) {
              if (next.slot3) {
                next.slot3.isCapped = true;
              }
              finishStage('E14');
            }
            break;
          }
          case 'E14': {
            next.cylE = Math.max(0, cur.cylE - 0.065);
            if (next.cylE <= 0) {
              finishStage('E15');
            }
            break;
          }
          case 'E15': {
            next.cylG = Math.max(0, cur.cylG - 0.06);
            if (next.cylG <= 0) {
              next.screwTicks = 0;
              finishStage('E16');
            }
            break;
          }
          case 'E16': {
            if (cur.cylE < 1) {
              next.cylE = Math.min(1, cur.cylE + 0.07);
              next.motorF = next.cylE >= 0.85;
            } else {
              next.motorF = true;
              next.screwAngle = (cur.screwAngle + 34) % 360;
              next.screwTicks = cur.screwTicks + 1;
              if (next.screwTicks >= 20) {
                next.motorF = false;
                next.screwTicks = 0;
                finishStage('E17');
              }
            }
            break;
          }
          case 'E17': {
            next.motorF = false;
            next.cylE = Math.max(0, cur.cylE - 0.065);
            if (next.cylE <= 0) {
              completedCycle = true;
              finishStage('E0');
            }
            break;
          }
        }

        if (completedCycle) {
          setBottledCount(c => c + 1);
          if (s.activeGemmaMode === 'CL' && clCycleActiveRef.current) {
            clCycleActiveRef.current = false;
            plantRunningRef.current = false;
            setPlantRunning(false);
          }
        }

        if (stageCompleted && s.activeGemmaMode === 'ET') {
          etStepPendingRef.current = false;
          etWaitingRef.current = true;
          setEtWaiting(true);
        }

        bottlingRef.current = next;
        setBottling(next);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [shouldTick]);

  // Manejadores de Consola GEMMA y Pulsadores
  const handleSelectGemmaMode = useCallback(
    (mode: GemmaMode) => {
      setLocalGemmaMode(mode);
      onSetGemmaMode?.(mode);

      if (mode === 'MAN') {
        plantRunningRef.current = false;
        setPlantRunning(false);
        clCycleActiveRef.current = false;
        etStepPendingRef.current = false;
        etWaitingRef.current = false;
        setEtWaiting(false);
        localPhaseRef.current = 'idle';
        setLocalPneumaticPhase('idle');
      } else {
        manConveyorRef.current = false;
        setManConveyorOn(false);
        manDiverterRef.current = false;
        setManDiverterOn(false);
        manTankPumpRef.current = false;
        setManTankPumpOn(false);
        manPneumaticTargetRef.current = 'idle';
        setManPneumaticTarget('idle');
        manBottlingTargetsRef.current = { ...INITIAL_MANUAL_TARGETS };
        setManBottlingTargets({ ...INITIAL_MANUAL_TARGETS });

        if (mode === 'ET') {
          etStepPendingRef.current = false;
          etWaitingRef.current = true;
          setEtWaiting(true);
        } else {
          etStepPendingRef.current = false;
          etWaitingRef.current = false;
          setEtWaiting(false);
        }
      }
    },
    [onSetGemmaMode]
  );

  const handleTogglePE = useCallback(() => {
    const nextPE = !isPE;
    setLocalEmergencyStop(nextPE);
    onToggleEmergencyStop?.();

    if (nextPE) {
      plantRunningRef.current = false;
      setPlantRunning(false);
      userStoppedRef.current = true;
      rearmingRef.current = false;
      setIsRearming(false);
      clCycleActiveRef.current = false;
      etStepPendingRef.current = false;
      etWaitingRef.current = false;
      setEtWaiting(false);
      localPhaseRef.current = 'idle';
      setLocalPneumaticPhase('idle');
      setDrainValveOpen(false);
      setIsQuickDraining(false);
      manConveyorRef.current = false;
      setManConveyorOn(false);
      manDiverterRef.current = false;
      setManDiverterOn(false);
      manTankPumpRef.current = false;
      setManTankPumpOn(false);
      manPneumaticTargetRef.current = 'idle';
      setManPneumaticTarget('idle');
      manBottlingTargetsRef.current = { ...INITIAL_MANUAL_TARGETS };
      setManBottlingTargets({ ...INITIAL_MANUAL_TARGETS });

      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      onStopPlant?.();
      onPressButton('btn_stop', true);
      stopTimerRef.current = setTimeout(() => {
        onPressButton('btn_stop', false);
      }, 350);
    } else {
      setPeAlertNotice(false);
    }
  }, [isPE, onPressButton, onStopPlant, onToggleEmergencyStop]);

  const handleRearm = useCallback(() => {
    if (isPE) {
      setPeAlertNotice(true);
      return;
    }

    setPeAlertNotice(false);
    userStoppedRef.current = false;
    plantRunningRef.current = false;
    setPlantRunning(false);
    clCycleActiveRef.current = false;
    etStepPendingRef.current = false;
    etWaitingRef.current = activeGemmaMode === 'ET';
    setEtWaiting(activeGemmaMode === 'ET');
    localPhaseRef.current = 'idle';
    setLocalPneumaticPhase('idle');
    setDrainValveOpen(false);
    setIsQuickDraining(false);
    manConveyorRef.current = false;
    setManConveyorOn(false);
    manDiverterRef.current = false;
    setManDiverterOn(false);
    manTankPumpRef.current = false;
    setManTankPumpOn(false);
    manPneumaticTargetRef.current = 'idle';
    setManPneumaticTarget('idle');
    manBottlingTargetsRef.current = { ...INITIAL_MANUAL_TARGETS };
    setManBottlingTargets({ ...INITIAL_MANUAL_TARGETS });

    const cur = bottlingRef.current;
    const needsSmoothHome =
      cur.cylA > 0.001 ||
      cur.cylB > 0.001 ||
      cur.cylC > 0.001 ||
      cur.cylE > 0.001 ||
      cur.cylG > 0.001 ||
      localPosRef.current > 0.001 ||
      frozenRealPistonRef.current > 0.001;

    if (needsSmoothHome) {
      rearmingRef.current = true;
      setIsRearming(true);
    } else {
      const resetBot = createInitialBottlingState();
      bottlingRef.current = resetBot;
      setBottling(resetBot);
    }

    onTriggerRearm?.();
  }, [activeGemmaMode, isPE, onTriggerRearm]);

  const handleStartClick = useCallback(() => {
    if (isPE) {
      setPeAlertNotice(true);
      return;
    }

    setPeAlertNotice(false);
    userStoppedRef.current = false;
    plantRunningRef.current = true;
    setPlantRunning(true);

    if (activeGemmaMode === 'CL') {
      clCycleActiveRef.current = true;
    } else if (activeGemmaMode === 'ET') {
      etWaitingRef.current = false;
      setEtWaiting(false);
      etStepPendingRef.current = true;
    }

    if (plantMode === 'pneumatic' && activeGemmaMode !== 'MAN') {
      localPhaseRef.current = localPosRef.current >= 0.96 ? 'retracting' : 'extending';
      setLocalPneumaticPhase(localPhaseRef.current);
    }

    if (plantMode === 'bottling' && activeGemmaMode !== 'MAN') {
      if (bottlingRef.current.stage === 'E0') {
        const advanced: BottlingState = { ...bottlingRef.current, stage: 'E1' };
        bottlingRef.current = advanced;
        setBottling(advanced);
      }
    }

    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    onPressButton('btn_start', true);
    startTimerRef.current = setTimeout(() => {
      onPressButton('btn_start', false);
    }, 300);
  }, [activeGemmaMode, isPE, onPressButton, plantMode]);

  const handleStopClick = useCallback(() => {
    plantRunningRef.current = false;
    setPlantRunning(false);
    userStoppedRef.current = true;
    clCycleActiveRef.current = false;
    etStepPendingRef.current = false;
    etWaitingRef.current = false;
    setEtWaiting(false);
    localPhaseRef.current = 'idle';
    setLocalPneumaticPhase('idle');
    setDrainValveOpen(false);
    setIsQuickDraining(false);
    manConveyorRef.current = false;
    setManConveyorOn(false);
    manDiverterRef.current = false;
    setManDiverterOn(false);
    manTankPumpRef.current = false;
    setManTankPumpOn(false);
    manPneumaticTargetRef.current = 'idle';
    setManPneumaticTarget('idle');
    manBottlingTargetsRef.current = {
      ...manBottlingTargetsRef.current,
      valveD: false,
      motorF: false
    };
    setManBottlingTargets({ ...manBottlingTargetsRef.current });

    if (hasRealPneumatic) {
      frozenRealPistonRef.current = firstPneumaticEntry?.position ?? localPosRef.current;
    }

    if (plantMode === 'bottling') {
      const stoppedBot: BottlingState = {
        ...bottlingRef.current,
        valveD: false,
        motorF: false
      };
      bottlingRef.current = stoppedBot;
      setBottling(stoppedBot);
    }

    onStopPlant?.();

    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    onPressButton('btn_stop', true);
    stopTimerRef.current = setTimeout(() => {
      onPressButton('btn_stop', false);
    }, 350);
  }, [firstPneumaticEntry?.position, hasRealPneumatic, onPressButton, onStopPlant, plantMode]);

  const handleCyclePulse = useCallback(() => {
    if (isPE) {
      setPeAlertNotice(true);
      return;
    }
    setPeAlertNotice(false);
    userStoppedRef.current = false;
    clCycleActiveRef.current = true;
    plantRunningRef.current = true;
    setPlantRunning(true);

    if (plantMode === 'pneumatic') {
      localPhaseRef.current = localPosRef.current >= 0.96 ? 'retracting' : 'extending';
      setLocalPneumaticPhase(localPhaseRef.current);
    } else if (plantMode === 'bottling' && bottlingRef.current.stage === 'E0') {
      const advanced: BottlingState = { ...bottlingRef.current, stage: 'E1' };
      bottlingRef.current = advanced;
      setBottling(advanced);
    }

    onTriggerCyclePulse?.();

    if (!isSimRunning) {
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      onPressButton('btn_start', true);
      startTimerRef.current = setTimeout(() => {
        onPressButton('btn_start', false);
      }, 300);
    }
  }, [isPE, isSimRunning, onPressButton, onTriggerCyclePulse, plantMode]);

  const handleStepPulse = useCallback(() => {
    if (isPE) {
      setPeAlertNotice(true);
      return;
    }
    setPeAlertNotice(false);
    userStoppedRef.current = false;
    etWaitingRef.current = false;
    setEtWaiting(false);
    etStepPendingRef.current = true;
    plantRunningRef.current = true;
    setPlantRunning(true);

    if (plantMode === 'pneumatic') {
      localPhaseRef.current = localPosRef.current >= 0.96 ? 'retracting' : 'extending';
      setLocalPneumaticPhase(localPhaseRef.current);
    } else if (plantMode === 'bottling' && bottlingRef.current.stage === 'E0') {
      const advanced: BottlingState = { ...bottlingRef.current, stage: 'E1' };
      bottlingRef.current = advanced;
      setBottling(advanced);
    }

    onTriggerStepPulse?.();

    if (!isSimRunning) {
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      onPressButton('btn_start', true);
      startTimerRef.current = setTimeout(() => {
        onPressButton('btn_start', false);
      }, 300);
    }
  }, [isPE, isSimRunning, onPressButton, onTriggerStepPulse, plantMode]);

  const handleResetAll = useCallback(() => {
    plantRunningRef.current = false;
    setPlantRunning(false);
    userStoppedRef.current = true;
    clCycleActiveRef.current = false;
    etStepPendingRef.current = false;
    etWaitingRef.current = false;
    setEtWaiting(false);
    rearmingRef.current = false;
    setIsRearming(false);

    setBoxPos(8);
    setProcessedBoxes(0);
    setSensorActive(false);
    setDiverterExtend(0);

    tankLevelRef.current = 20;
    tankHysteresisRef.current = false;
    setTankLevel(20);
    setTankHysteresisHold(false);
    setDrainValveOpen(false);
    setIsQuickDraining(false);

    localPosRef.current = 0;
    localPhaseRef.current = 'idle';
    localDwellRef.current = 0;
    wasAtEndRef.current = false;
    frozenRealPistonRef.current = 0;
    setLocalPistonPos(0);
    setLocalPneumaticPhase('idle');
    setPneumaticCycles(0);

    const resetBot = createInitialBottlingState();
    bottlingRef.current = resetBot;
    setBottling(resetBot);
    setBottledCount(0);

    manConveyorRef.current = false;
    setManConveyorOn(false);
    manDiverterRef.current = false;
    setManDiverterOn(false);
    manTankPumpRef.current = false;
    setManTankPumpOn(false);
    manPneumaticTargetRef.current = 'idle';
    setManPneumaticTarget('idle');
    manBottlingTargetsRef.current = { ...INITIAL_MANUAL_TARGETS };
    setManBottlingTargets({ ...INITIAL_MANUAL_TARGETS });
  }, []);

  // Handlers de Jogs Manuales (MAN / F4)
  const toggleManualBottling = (key: keyof ManualBottlingTargets) => {
    if (isPE || activeGemmaMode !== 'MAN') return;
    userStoppedRef.current = false;
    const next: ManualBottlingTargets = {
      ...manBottlingTargetsRef.current,
      [key]: !manBottlingTargetsRef.current[key]
    };
    manBottlingTargetsRef.current = next;
    setManBottlingTargets(next);
  };

  if (!isOpen && !embeddedMode) return null;

  // Código de estado GEMMA efectivo
  const computedGemmaCode = isPE
    ? 'D1'
    : isRearming
      ? 'A6'
      : activeGemmaMode === 'MAN'
        ? 'F4'
        : activeGemmaMode === 'ET' && (plantRunning || etWaiting || bottling.stage !== 'E0')
          ? 'F5'
          : activeGemmaMode === 'CL' && plantRunning
            ? 'A2'
            : activeGemmaMode === 'AU' && plantRunning
              ? 'F1'
              : 'A1';

  const effectiveGemmaCode = computedGemmaCode || gemmaStateCode || 'A1';

  // Derivados de Cinta
  const boxX = 52 + ((boxPos - 5) / 91) * 218;
  const rodExtendPx = Math.round(pistonPos * 92);

  // Derivados del Tanque
  const isActivelyPumping = isTankPumpCommand && !tankHysteresisHold && !isQuickDraining;
  const isTankDraining =
    isSimRunning && !isPE && (isQuickDraining || (drainValveOpen && tankLevel > 15.2));
  const tankMaxReached = tankLevel >= 94.5;
  const tankMinActive = tankLevel <= 22;
  const waterHeightPx = Math.max(4, (tankLevel / 100) * 102);
  const waterTopY = 128 - waterHeightPx;

  // Derivados de Embotelladora 5 Cilindros + 2 Válvulas
  const reedBotA0 = bottling.cylA <= 0.05;
  const reedBotA1 = bottling.cylA >= 0.95;
  const reedBotB0 = bottling.cylB <= 0.05;
  const reedBotB1 = bottling.cylB >= 0.95;
  const reedBotC0 = bottling.cylC <= 0.05;
  const reedBotC1 = bottling.cylC >= 0.95;
  const reedBotE0 = bottling.cylE <= 0.05;
  const reedBotE1 = bottling.cylE >= 0.95;
  const reedBotG0 = bottling.cylG <= 0.05;
  const reedBotG1 = bottling.cylG >= 0.95;

  const cp1Active =
    (bottling.stage !== 'E1' && bottling.slot1 !== null) ||
    (bottling.stage === 'E3' && bottling.cylA >= 0.85);
  const cp2Active =
    (bottling.stage !== 'E1' && bottling.slot2 !== null) ||
    (bottling.stage === 'E1' && bottling.cylB >= 0.9 && bottling.slot1 !== null);
  const cp3Active =
    (bottling.stage !== 'E1' && bottling.slot3 !== null) ||
    (bottling.stage === 'E1' && bottling.cylB >= 0.9 && bottling.slot2 !== null);

  // Colores Torreta GEMMA 3 colores
  const towerRedOn = effectiveGemmaCode === 'D1' || isPE;
  const towerYellowOn = effectiveGemmaCode === 'F4' || effectiveGemmaCode === 'A6';
  const towerGreenOn =
    effectiveGemmaCode === 'F1' ||
    effectiveGemmaCode === 'A2' ||
    effectiveGemmaCode === 'F5';

  const isGlobalActive =
    !isPE &&
    isSimRunning &&
    !userStoppedRef.current &&
    (isConveyorDriving ||
      isActivelyPumping ||
      y1Active ||
      y2Active ||
      isBottlingAutoDrive ||
      (activeGemmaMode === 'MAN' &&
        (manBottlingTargets.valveD ||
          manBottlingTargets.motorF ||
          manConveyorOn ||
          manTankPumpOn)));

  const plantBadge =
    plantMode === 'conveyor'
      ? 'CINTA'
      : plantMode === 'tank'
        ? 'TANQUE'
        : plantMode === 'pneumatic'
          ? 'NEUMÁTICA'
          : 'EMBOTELLADORA';

  const wrapperClass = embeddedMode
    ? 'w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden text-slate-800 select-none'
    : `absolute top-14 right-4 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800 transition-all select-none animate-in fade-in zoom-in-95 duration-200 ${
        isMinimized ? 'w-72 shadow-lg' : 'w-[540px]'
      }`;

  const modeButtons: Array<{ id: PlantMode; label: string }> = [
    { id: 'conveyor', label: 'Cinta' },
    { id: 'tank', label: 'Tanque' },
    { id: 'pneumatic', label: 'Neumática' },
    { id: 'bottling', label: 'Embotelladora' }
  ];

  const gemmaModes: Array<{ id: GemmaMode; label: string; code: string }> = [
    { id: 'AU', label: 'AU', code: 'F1' },
    { id: 'CL', label: 'CL', code: 'A2' },
    { id: 'ET', label: 'ET', code: 'F5' },
    { id: 'MAN', label: 'MAN', code: 'F4' }
  ];

  const gemmaBadgeColor =
    effectiveGemmaCode === 'D1'
      ? 'bg-rose-500/25 text-rose-200 border-rose-400/50'
      : effectiveGemmaCode === 'F4' || effectiveGemmaCode === 'A6'
        ? 'bg-amber-500/25 text-amber-200 border-amber-400/50'
        : effectiveGemmaCode === 'F1' ||
            effectiveGemmaCode === 'A2' ||
            effectiveGemmaCode === 'F5'
          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50'
          : 'bg-slate-600/50 text-slate-200 border-slate-400/40';

  const renderBottleSvg = (
    x: number,
    y: number,
    slot: BottleSlot,
    keyId: string
  ) => {
    const clampedFill = Math.max(0, Math.min(100, slot.fillLevel));
    const liquidH = (clampedFill / 100) * 26;
    return (
      <g key={keyId} transform={`translate(${x}, ${y})`}>
        <ellipse cx="0" cy="-1" rx="10" ry="2.2" fill="#0f172a" fillOpacity="0.2" />
        {clampedFill > 0 && (
          <>
            <rect
              x="-8.5"
              y={-2 - liquidH}
              width="17"
              height={liquidH}
              rx="2"
              fill="url(#bot-liquid)"
            />
            <line
              x1="-8"
              y1={-2 - liquidH}
              x2="8"
              y2={-2 - liquidH}
              stroke="#bae6fd"
              strokeWidth="1.4"
            />
          </>
        )}
        <path
          d="M -9.5,-2 L -9.5,-27 Q -9.5,-32 -4.5,-35 L -4.5,-43 L 4.5,-43 L 4.5,-35 Q 9.5,-32 9.5,-27 L 9.5,-2 Q 9.5,0 7.5,0 L -7.5,0 Q -9.5,0 -9.5,-2 Z"
          fill="url(#bot-glass)"
          stroke="#334155"
          strokeWidth="1.4"
        />
        <line
          x1="-6.5"
          y1="-25"
          x2="-6.5"
          y2="-6"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.85"
          strokeLinecap="round"
        />
        <rect
          x="-7.5"
          y="-19"
          width="15"
          height="8"
          rx="1.2"
          fill="#ffffff"
          fillOpacity="0.88"
          stroke="#94a3b8"
          strokeWidth="0.6"
        />
        <text x="0" y="-13.2" textAnchor="middle" fontSize="4.6" fontWeight="bold" fill="#0369a1">
          BARU
        </text>
        {slot.isCapped && (
          <rect
            x="-5.8"
            y="-46"
            width="11.6"
            height="5.5"
            rx="1.5"
            fill="#1d4ed8"
            stroke="#1e3a8a"
            strokeWidth="1"
          />
        )}
      </g>
    );
  };

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
              isPE
                ? 'bg-rose-500 animate-ping'
                : isGlobalActive
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-slate-400'
            }`}
          />
          <h3 className="text-xs font-bold font-sans tracking-wide flex items-center gap-1.5 truncate">
            <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">
              Gemelo Digital Planta 2D
              {!embeddedMode &&
                isMinimized &&
                (isPE ? ' · PE ACTIVO' : isGlobalActive ? ' · EN MARCHA' : ' · PARADO')}
            </span>
          </h3>
          <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 font-bold shrink-0">
            {plantBadge}
          </span>
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold shrink-0 ${gemmaBadgeColor}`}
          >
            GEMMA {effectiveGemmaCode}
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
                  onClick={() => selectPlantMode(m.id)}
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
            className={`relative bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200 border-b border-slate-200 overflow-hidden flex items-center justify-center p-2.5 ${
              embeddedMode ? 'h-80' : plantMode === 'bottling' ? 'h-60' : 'h-56'
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
                    <stop offset="0%" stopColor={isConveyorDriving ? '#0284c7' : '#64748b'} />
                    <stop offset="100%" stopColor={isConveyorDriving ? '#0369a1' : '#334155'} />
                  </linearGradient>
                  <linearGradient id="conv-box" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="26" x2="360" y2="26" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="16" y1="160" x2="346" y2="160" stroke="#94a3b8" strokeWidth="2" />

                {/* Torreta Andon */}
                <g transform="translate(20, 20)">
                  <line x1="7" y1="40" x2="7" y2="140" stroke="#475569" strokeWidth="2.5" />
                  <rect x="2" y="136" width="10" height="4" rx="1" fill="#334155" />
                  <rect x="0" y="0" width="14" height="40" rx="2.5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  {(!isConveyorDriving || isPE) && (
                    <circle cx="7" cy="8" r="6" fill="#ef4444" fillOpacity="0.25" />
                  )}
                  <circle cx="7" cy="8" r="4" fill={!isConveyorDriving || isPE ? '#ef4444' : '#450a0a'} />
                  {sensorActive && !isPE && (
                    <circle cx="7" cy="20" r="6" fill="#f59e0b" fillOpacity="0.3" />
                  )}
                  <circle cx="7" cy="20" r="4" fill={sensorActive && !isPE ? '#f59e0b' : '#451a03'} />
                  {isConveyorDriving && (
                    <circle cx="7" cy="32" r="6" fill="#10b981" fillOpacity="0.3" />
                  )}
                  <circle cx="7" cy="32" r="4" fill={isConveyorDriving ? '#10b981' : '#064e3b'} />
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
                  <rect
                    x="8.5"
                    y="28"
                    width="5"
                    height={12 + diverterExtend * 14}
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
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

                <line
                  x1="58"
                  y1="106.5"
                  x2="288"
                  y2="106.5"
                  stroke="#38bdf8"
                  strokeOpacity={isConveyorDriving ? 0.8 : 0.25}
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

                {/* Caja Industrial */}
                <g transform={`translate(${boxX}, 78)`}>
                  <rect x="1" y="25" width="28" height="3" rx="1" fill="#0f172a" fillOpacity="0.2" />
                  <rect x="0" y="0" width="30" height="26" rx="2.5" fill="url(#conv-box)" stroke="#78350f" strokeWidth="1.5" />
                  <line x1="0" y1="13" x2="30" y2="13" stroke="#92400e" strokeWidth="0.8" strokeOpacity="0.45" />
                  <rect x="6" y="4" width="18" height="7" fill="#fef3c7" rx="1" />
                  <text x="15" y="9.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#78350f">
                    BARU
                  </text>
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
                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (isPE || !isSimRunning) return;
                      setDrainValveOpen(v => !v);
                    }}
                    disabled={isPE || !isSimRunning}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs flex items-center gap-1 transition-colors disabled:opacity-45 cursor-pointer ${
                      drainValveOpen
                        ? 'bg-sky-600 text-white border-sky-700 hover:bg-sky-500'
                        : 'bg-white/95 text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Droplets className="w-3 h-3" />
                    <span>Válvula Salida: {drainValveOpen ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isPE || !isSimRunning) return;
                      setIsQuickDraining(true);
                    }}
                    disabled={isPE || !isSimRunning || tankLevel <= 15.2}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-xs flex items-center gap-1 transition-colors disabled:opacity-45 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-3 h-3 text-amber-600" />
                    <span>Vaciar</span>
                  </button>
                </div>

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

                  <line x1="16" y1="160" x2="346" y2="160" stroke="#94a3b8" strokeWidth="2" />

                  <path d="M 18,128 L 46,128" stroke="#475569" strokeWidth="8" fill="none" strokeLinecap="round" />
                  <path
                    d="M 18,128 L 46,128"
                    stroke={isActivelyPumping ? '#38bdf8' : '#94a3b8'}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="6 6"
                    strokeDashoffset={-flowOffset}
                  />

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

                  <rect x="160" y="22" width="12" height="8" rx="1.5" fill="#334155" />
                  <rect x="136" y="132" width="8" height="28" fill="#334155" rx="1" />
                  <rect x="236" y="132" width="8" height="28" fill="#334155" rx="1" />

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

                  <g clipPath="url(#tank-inner-clip)">
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

                    <rect
                      x="128"
                      y={waterTopY}
                      width="124"
                      height={waterHeightPx + 4}
                      fill="url(#tank-water)"
                    />

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

                  <g transform="translate(242, 31)">
                    <line x1="-10" y1="0" x2="12" y2="0" stroke={tankMaxReached ? '#f59e0b' : '#475569'} strokeWidth="1.5" />
                    <rect x="12" y="-5" width="18" height="10" rx="2" fill="#0f172a" />
                    <circle cx="17" cy="0" r="2.5" fill={tankMaxReached ? '#f59e0b' : '#475569'} />
                    {tankMaxReached && <circle cx="17" cy="0" r="5" fill="#f59e0b" fillOpacity="0.35" />}
                    <text x="34" y="3" fontSize="7.5" fontWeight="bold" fill={tankMaxReached ? '#d97706' : '#64748b'}>
                      MAX
                    </text>
                  </g>

                  <g transform="translate(242, 108)">
                    <line x1="-10" y1="0" x2="12" y2="0" stroke={tankMinActive ? '#0ea5e9' : '#475569'} strokeWidth="1.5" />
                    <rect x="12" y="-5" width="18" height="10" rx="2" fill="#0f172a" />
                    <circle cx="17" cy="0" r="2.5" fill={tankMinActive ? '#38bdf8' : '#475569'} />
                    {tankMinActive && <circle cx="17" cy="0" r="5" fill="#38bdf8" fillOpacity="0.35" />}
                    <text x="34" y="3" fontSize="7.5" fontWeight="bold" fill={tankMinActive ? '#0284c7' : '#64748b'}>
                      MIN
                    </text>
                  </g>

                  <g transform="translate(190, 78)">
                    <rect x="-26" y="-13" width="52" height="22" rx="6" fill="#0f172a" fillOpacity="0.78" />
                    <text x="0" y="3" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">
                      {Math.round(tankLevel)}%
                    </text>
                  </g>

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

                  <g transform="translate(292, 122)">
                    <polygon
                      points="-8,-7 0,0 -8,7"
                      fill={isTankDraining || drainValveOpen ? '#10b981' : '#ef4444'}
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                    <polygon
                      points="8,-7 0,0 8,7"
                      fill={isTankDraining || drainValveOpen ? '#10b981' : '#ef4444'}
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                    <line x1="0" y1="0" x2="0" y2="-11" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="-6" y1="-11" x2="6" y2="-11" stroke="#0f172a" strokeWidth="2" />
                    <text x="0" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#475569">
                      -V1
                    </text>
                  </g>

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
                  <line x1="18" y1="154" x2="342" y2="154" stroke="#94a3b8" strokeWidth="2" />

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

                  <path d="M 52,118 L 106,118" fill="none" stroke="#64748b" strokeWidth="3" />

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

                  <g transform="translate(100, 36)">
                    <rect x="0" y="10" width="102" height="36" rx="3" fill="#cbd5e1" stroke="#1e293b" strokeWidth="2" />
                    <rect
                      x="3"
                      y="13"
                      width={Math.max(4, rodExtendPx * 0.85)}
                      height="30"
                      fill={y1Active ? '#38bdf8' : '#e2e8f0'}
                      fillOpacity={y1Active ? 0.65 : 0.45}
                    />
                    <rect
                      x={16 + rodExtendPx * 0.85}
                      y="13"
                      width={Math.max(2, 83 - rodExtendPx * 0.85)}
                      height="30"
                      fill={y2Active ? '#fbbf24' : '#e2e8f0'}
                      fillOpacity={y2Active ? 0.55 : 0.35}
                    />
                    <rect x={5 + rodExtendPx * 0.85} y="12" width="11" height="32" rx="1" fill="#334155" />
                    <line x1={7 + rodExtendPx * 0.85} y1="12" x2={7 + rodExtendPx * 0.85} y2="44" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1={14 + rodExtendPx * 0.85} y1="12" x2={14 + rodExtendPx * 0.85} y2="44" stroke="#0f172a" strokeWidth="1.5" />

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

                  <g transform="translate(106, 106)">
                    <rect x="0" y="0" width="90" height="30" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                    <rect x="4" y="4" width="20" height="22" rx="2" fill={y1Active ? '#0284c7' : '#334155'} />
                    <text x="14" y="18" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#fff">
                      Y1
                    </text>
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

                  <rect x="306" y="46" width="14" height="108" rx="2" fill="#475569" stroke="#1e293b" strokeWidth="1.2" />
                  <rect x="303" y="52" width="3" height="24" rx="1" fill={reedA1 ? '#10b981' : '#94a3b8'} />
                </svg>
              </>
            )}

            {/* ==================== MODO 4: EMBOTELLADORA ELECTRONEUMÁTICA 5 CILINDROS ==================== */}
            {plantMode === 'bottling' && (
              <svg className="w-full h-full" viewBox="0 0 640 245">
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
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
                    <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.72" />
                  </linearGradient>
                  <linearGradient id="bot-cyl-body" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                </defs>

                {/* Piso industrial y pórtico superior */}
                <line x1="10" y1="228" x2="630" y2="228" stroke="#94a3b8" strokeWidth="2.2" />
                <rect x="130" y="10" width="465" height="6" rx="2" fill="#334155" />

                {/* Insignia Manifold Neumático 6 BAR (100% Electroneumática - Cero motores trifásicos) */}
                <g transform="translate(74, 20)">
                  <rect x="0" y="0" width="118" height="22" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
                  <circle cx="12" cy="11" r="6" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.2" />
                  <line x1="12" y1="11" x2="15.5" y2="7.5" stroke="#dc2626" strokeWidth="1.4" />
                  <circle cx="12" cy="11" r="1.2" fill="#0f172a" />
                  <text x="23" y="10" fontSize="6.4" fontWeight="bold" fill="#38bdf8" fontFamily="monospace">
                    6 BAR · NEUMÁTICA
                  </text>
                  <text x="23" y="18" fontSize="5.8" fontWeight="bold" fill="#cbd5e1" fontFamily="monospace">
                    5 CILINDROS + V7/V8
                  </text>
                </g>

                {/* Torreta GEMMA 3 Colores (Roja H_PE / Amarilla H_MAN / Verde H_RUN) */}
                <g transform="translate(14, 16)">
                  <line x1="10" y1="62" x2="10" y2="212" stroke="#475569" strokeWidth="3" />
                  <rect x="3" y="207" width="14" height="5" rx="1.5" fill="#334155" />
                  <rect x="0" y="0" width="20" height="64" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.3" />

                  {/* H_PE Roja (D1) */}
                  {towerRedOn && (
                    <circle cx="10" cy="13" r="9" fill="#ef4444" fillOpacity="0.35" className="animate-pulse" />
                  )}
                  <circle cx="10" cy="13" r="5.5" fill={towerRedOn ? '#ef4444' : '#450a0a'} />
                  <text x="24" y="15.5" fontSize="7" fontWeight="bold" fill={towerRedOn ? '#dc2626' : '#64748b'}>
                    H_PE
                  </text>

                  {/* H_MAN Amarilla (F4 / A6) */}
                  {towerYellowOn && (
                    <circle cx="10" cy="32" r="9" fill="#f59e0b" fillOpacity="0.35" />
                  )}
                  <circle cx="10" cy="32" r="5.5" fill={towerYellowOn ? '#f59e0b' : '#451a03'} />
                  <text x="24" y="34.5" fontSize="7" fontWeight="bold" fill={towerYellowOn ? '#d97706' : '#64748b'}>
                    H_MAN
                  </text>

                  {/* H_RUN Verde (F1 / A2 / F5) */}
                  {towerGreenOn && (
                    <circle cx="10" cy="51" r="9" fill="#10b981" fillOpacity="0.35" />
                  )}
                  <circle cx="10" cy="51" r="5.5" fill={towerGreenOn ? '#10b981' : '#064e3b'} />
                  <text x="24" y="53.5" fontSize="7" fontWeight="bold" fill={towerGreenOn ? '#059669' : '#64748b'}>
                    H_RUN
                  </text>
                </g>

                {/* ==================== ESTACIÓN 1: CARGA (CILINDRO A + CP1) ==================== */}
                <g transform="translate(52, 54)">
                  {/* Etiqueta Estación 1 */}
                  <rect x="150" y="-34" width="72" height="15" rx="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                  <text x="186" y="-24" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1e293b">
                    EST. 1 · CARGA
                  </text>

                  {/* Cargador / Tolva vertical de botellas */}
                  <rect x="44" y="16" width="32" height="106" rx="3" fill="#f8fafc" fillOpacity="0.65" stroke="#64748b" strokeWidth="1.4" strokeDasharray="3 2" />
                  <text x="60" y="28" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#475569">
                    ALMACÉN
                  </text>
                  {/* Botella en espera dentro del almacén */}
                  <g transform="translate(60, 74) scale(0.75)">
                    <path
                      d="M -9,-2 L -9,-25 Q -9,-30 -4,-33 L -4,-40 L 4,-40 L 4,-33 Q 9,-30 9,-25 L 9,-2 Z"
                      fill="#e0f2fe"
                      stroke="#64748b"
                      strokeWidth="1.4"
                    />
                  </g>

                  {/* Cilindro Horizontal A (Doble Efecto) */}
                  <g transform="translate(0, 82)">
                    <rect x="0" y="6" width="56" height="22" rx="2.5" fill="url(#bot-cyl-body)" stroke="#1e293b" strokeWidth="1.6" />
                    <rect
                      x="3"
                      y="9"
                      width={Math.max(3, bottling.cylA * 42)}
                      height="16"
                      fill="#38bdf8"
                      fillOpacity={bottling.cylA > 0.05 ? 0.5 : 0.15}
                    />
                    <rect x={4 + bottling.cylA * 42} y="8" width="7" height="18" rx="1" fill="#334155" />
                    {/* Vástago A */}
                    <rect
                      x={11 + bottling.cylA * 42}
                      y="14"
                      width="48"
                      height="6"
                      rx="1"
                      fill="#f8fafc"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    {/* Empujador A */}
                    <rect
                      x={57 + bottling.cylA * 42}
                      y="8"
                      width="9"
                      height="18"
                      rx="1.5"
                      fill="#0284c7"
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                    <text x="28" y="38" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0369a1">
                      CIL. A
                    </text>
                    {/* Reed a0 / a1 */}
                    <rect x="2" y="-6" width="13" height="9" rx="1.5" fill={reedBotA0 ? '#10b981' : '#475569'} />
                    <text x="8.5" y="-8.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={reedBotA0 ? '#059669' : '#64748b'}>
                      a0
                    </text>
                    <rect x="41" y="-6" width="13" height="9" rx="1.5" fill={reedBotA1 ? '#10b981' : '#475569'} />
                    <text x="47.5" y="-8.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={reedBotA1 ? '#059669' : '#64748b'}>
                      a1
                    </text>
                  </g>
                </g>

                {/* ==================== ESTACIÓN 2: LLENADO / DOSIFICACIÓN (CILINDRO C + VÁLVULA D+ V7) ==================== */}
                <g transform="translate(345, 16)">
                  <rect x="-46" y="4" width="92" height="15" rx="3" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1" />
                  <text x="0" y="14" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0369a1">
                    EST. 2 · DOSIFICADOR
                  </text>

                  {/* Tanque / Dosificador lateral */}
                  <rect x="-52" y="24" width="32" height="44" rx="3" fill="url(#bot-hopper)" stroke="#334155" strokeWidth="1.4" />
                  <rect x="-47" y="32" width="22" height="28" rx="1.5" fill="#e0f2fe" stroke="#64748b" strokeWidth="0.8" />
                  <rect x="-46" y="40" width="20" height="19" rx="1" fill="url(#bot-liquid)" fillOpacity="0.88" />
                  {/* Válvula Monoestable D+ (V7) */}
                  <rect
                    x="-50"
                    y="72"
                    width="28"
                    height="16"
                    rx="2.5"
                    fill={bottling.valveD ? '#0284c7' : '#334155'}
                    stroke="#0f172a"
                    strokeWidth="1.2"
                  />
                  <text x="-36" y="82.5" textAnchor="middle" fontSize="6.8" fontWeight="bold" fill="#ffffff">
                    D+ V7
                  </text>
                  {/* Manguera dosificadora hacia boquilla */}
                  <path
                    d={`M -22,80 L -6,80 L -6,${84 + bottling.cylC * 26}`}
                    fill="none"
                    stroke={bottling.valveD ? '#22d3ee' : '#64748b'}
                    strokeWidth="2.6"
                    strokeLinejoin="round"
                  />

                  {/* Cilindro Vertical C */}
                  <rect x="-13" y="24" width="26" height="48" rx="3" fill="url(#bot-cyl-body)" stroke="#1e293b" strokeWidth="1.6" />
                  <rect
                    x="-10"
                    y="27"
                    width="20"
                    height={Math.max(3, bottling.cylC * 38)}
                    fill="#38bdf8"
                    fillOpacity={bottling.cylC > 0.05 ? 0.45 : 0.15}
                  />
                  <text x="0" y="44" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0f172a">
                    CIL. C
                  </text>

                  {/* Reed c0 / c1 */}
                  <rect x="14" y="25" width="13" height="9" rx="1.5" fill={reedBotC0 ? '#10b981' : '#475569'} />
                  <text x="35" y="32" fontSize="7" fontWeight="bold" fill={reedBotC0 ? '#059669' : '#64748b'}>
                    c0
                  </text>
                  <rect x="14" y="60" width="13" height="9" rx="1.5" fill={reedBotC1 ? '#10b981' : '#475569'} />
                  <text x="35" y="67" fontSize="7" fontWeight="bold" fill={reedBotC1 ? '#059669' : '#64748b'}>
                    c1
                  </text>

                  {/* Vástago vertical C + Boquilla */}
                  <rect
                    x="-3"
                    y="72"
                    width="6"
                    height={14 + bottling.cylC * 28}
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points={`-5,${86 + bottling.cylC * 28} 5,${86 + bottling.cylC * 28} 2.5,${96 + bottling.cylC * 28} -2.5,${96 + bottling.cylC * 28}`}
                    fill={bottling.valveD ? '#0284c7' : '#475569'}
                    stroke="#0f172a"
                    strokeWidth="1"
                  />

                  {/* Chorro de dosificación D+ dentro de la botella */}
                  {bottling.valveD && (
                    <>
                      <rect
                        x="-2"
                        y={96 + bottling.cylC * 28}
                        width="4"
                        height={Math.max(12, 60 - bottling.cylC * 28)}
                        fill="#22d3ee"
                        fillOpacity="0.88"
                      />
                      <line
                        x1="0"
                        y1={96 + bottling.cylC * 28}
                        x2="0"
                        y2="155"
                        stroke="#ecfeff"
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                        strokeDashoffset={-flowOffset * 1.5}
                      />
                    </>
                  )}
                </g>

                {/* ==================== ESTACIÓN 3: TAPONADO & ROSCADO (CIL. E + MOTOR F+ V8 + CIL. G) ==================== */}
                <g transform="translate(505, 16)">
                  <rect x="-50" y="4" width="102" height="15" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
                  <text x="1" y="14" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#92400e">
                    EST. 3 · TAPÓN / ROSCA
                  </text>

                  {/* Cilindro Vertical E (Baja Cabezal) */}
                  <rect x="-14" y="24" width="28" height="46" rx="3" fill="url(#bot-cyl-body)" stroke="#1e293b" strokeWidth="1.6" />
                  <rect
                    x="-11"
                    y="27"
                    width="22"
                    height={Math.max(3, bottling.cylE * 36)}
                    fill="#fbbf24"
                    fillOpacity={bottling.cylE > 0.05 ? 0.5 : 0.15}
                  />
                  <text x="0" y="43" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0f172a">
                    CIL. E
                  </text>

                  {/* Reed e0 / e1 */}
                  <rect x="-29" y="25" width="13" height="9" rx="1.5" fill={reedBotE0 ? '#10b981' : '#475569'} />
                  <text x="-38" y="32" fontSize="7" fontWeight="bold" fill={reedBotE0 ? '#059669' : '#64748b'}>
                    e0
                  </text>
                  <rect x="-29" y="58" width="13" height="9" rx="1.5" fill={reedBotE1 ? '#10b981' : '#475569'} />
                  <text x="-38" y="65" fontSize="7" fontWeight="bold" fill={reedBotE1 ? '#059669' : '#64748b'}>
                    e1
                  </text>

                  {/* Vástago E + Motor Neumático Roscador F+ (V8) */}
                  <rect
                    x="-3.5"
                    y="70"
                    width="7"
                    height={14 + bottling.cylE * 28}
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <g transform={`translate(0, ${84 + bottling.cylE * 28})`}>
                    {/* Cuerpo Motor Neumático F+ (V8) */}
                    <rect
                      x="-13"
                      y="0"
                      width="26"
                      height="15"
                      rx="2.5"
                      fill={bottling.motorF ? '#d97706' : '#475569'}
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                    <text x="0" y="10" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#ffffff">
                      F+ V8
                    </text>
                    {/* Rotor / Husillo giratorio de roscado */}
                    <rect x="-8" y="15" width="16" height="6" rx="1" fill="#1e293b" />
                    <g transform={`translate(0, 18)`}>
                      <line
                        x1={Math.cos((bottling.screwAngle * Math.PI) / 180) * -6}
                        y1="0"
                        x2={Math.cos((bottling.screwAngle * Math.PI) / 180) * 6}
                        y2="0"
                        stroke={bottling.motorF ? '#fbbf24' : '#94a3b8'}
                        strokeWidth="2"
                      />
                    </g>
                    {bottling.motorF && (
                      <>
                        <path
                          d="M -17,18 A 17,6 0 0,0 17,18"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.6"
                          strokeDasharray="4 3"
                          strokeDashoffset={-flowOffset}
                        />
                        <text x="-22" y="10" textAnchor="end" fontSize="6.5" fontWeight="bold" fill="#d97706">
                          ROSCANDO
                        </text>
                      </>
                    )}
                  </g>

                  {/* Cilindro Horizontal G (Presentador de Tapón) */}
                  <g transform="translate(36, 78)">
                    <rect x="26" y="4" width="54" height="20" rx="2.5" fill="url(#bot-cyl-body)" stroke="#1e293b" strokeWidth="1.5" />
                    <rect
                      x={29 + (1 - bottling.cylG) * 40}
                      y="7"
                      width={Math.max(3, bottling.cylG * 40)}
                      height="14"
                      fill="#10b981"
                      fillOpacity={bottling.cylG > 0.05 ? 0.5 : 0.15}
                    />
                    {/* Vástago G extendiendo hacia la izquierda */}
                    <rect
                      x={2 - bottling.cylG * 32}
                      y="11"
                      width={26 + bottling.cylG * 32}
                      height="6"
                      rx="1"
                      fill="#f8fafc"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />
                    {/* Pinza presentadora + Tapón azul */}
                    <rect
                      x={-8 - bottling.cylG * 32}
                      y="8"
                      width="11"
                      height="12"
                      rx="1.5"
                      fill="#059669"
                      stroke="#0f172a"
                      strokeWidth="1.1"
                    />
                    {(bottling.stage === 'E12' ||
                      (bottling.stage === 'E13' && (!bottling.slot3 || !bottling.slot3.isCapped)) ||
                      (activeGemmaMode === 'MAN' && bottling.cylG > 0.2)) && (
                      <rect
                        x={-8.5 - bottling.cylG * 32}
                        y="20"
                        width="11.5"
                        height="5"
                        rx="1.5"
                        fill="#1d4ed8"
                        stroke="#1e3a8a"
                        strokeWidth="1"
                      />
                    )}
                    <text x="53" y="34" textAnchor="middle" fontSize="7.2" fontWeight="bold" fill="#047857">
                      CIL. G
                    </text>
                    {/* Reed g1 (izq) y g0 (der) */}
                    <rect x="28" y="-6" width="13" height="9" rx="1.5" fill={reedBotG1 ? '#10b981' : '#475569'} />
                    <text x="34.5" y="-8.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={reedBotG1 ? '#059669' : '#64748b'}>
                      g1
                    </text>
                    <rect x="65" y="-6" width="13" height="9" rx="1.5" fill={reedBotG0 ? '#10b981' : '#475569'} />
                    <text x="71.5" y="-8.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={reedBotG0 ? '#059669' : '#64748b'}>
                      g0
                    </text>
                  </g>
                </g>

                {/* ==================== RIEL DE TRANSFERENCIA & CILINDRO B ==================== */}
                {/* Patas soporte */}
                <rect x="145" y="180" width="7" height="48" fill="#334155" rx="1" />
                <rect x="342" y="180" width="7" height="48" fill="#334155" rx="1" />
                <rect x="540" y="180" width="7" height="48" fill="#334155" rx="1" />

                {/* Guía lineal de transferencia paso a paso */}
                <rect x="128" y="170" width="470" height="11" rx="2.5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.8" />
                <line x1="134" y1="173" x2="592" y2="173" stroke="#64748b" strokeWidth="1.4" strokeDasharray="6 6" />

                {/* Barra indexadora móvil accionada por Cilindro B */}
                <g transform={`translate(${bottling.cylB * 160}, 0)`}>
                  <line x1="168" y1="166" x2="522" y2="166" stroke="#0284c7" strokeWidth="2.5" />
                  {/* Trinquete empujador Est. 1 -> Est. 2 */}
                  <rect x="166" y="156" width="6" height="12" rx="1" fill="#0ea5e9" stroke="#0f172a" strokeWidth="1" />
                  {/* Trinquete empujador Est. 2 -> Est. 3 */}
                  <rect x="326" y="156" width="6" height="12" rx="1" fill="#0ea5e9" stroke="#0f172a" strokeWidth="1" />
                  {/* Trinquete empujador Est. 3 -> Salida */}
                  <rect x="486" y="156" width="6" height="12" rx="1" fill="#0ea5e9" stroke="#0f172a" strokeWidth="1" />
                </g>

                {/* Cilindro Horizontal B (Avance Transferencia) */}
                <g transform="translate(56, 190)">
                  <rect x="0" y="6" width="84" height="22" rx="2.5" fill="url(#bot-cyl-body)" stroke="#1e293b" strokeWidth="1.6" />
                  <rect
                    x="3"
                    y="9"
                    width={Math.max(4, bottling.cylB * 68)}
                    height="16"
                    fill="#0ea5e9"
                    fillOpacity={bottling.cylB > 0.05 ? 0.55 : 0.15}
                  />
                  <rect x={6 + bottling.cylB * 68} y="8" width="8" height="18" rx="1" fill="#334155" />
                  {/* Vástago B conectado a la barra de transferencia */}
                  <rect
                    x={14 + bottling.cylB * 68}
                    y="14"
                    width={76 + bottling.cylB * 92}
                    height="6"
                    rx="1"
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={90 + bottling.cylB * 160}
                    y1="17"
                    x2={112 + bottling.cylB * 160}
                    y2="-24"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                  />
                  <text x="42" y="37" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0369a1">
                    CIL. B (AVANCE)
                  </text>
                  {/* Reed b0 / b1 */}
                  <rect x="3" y="-6" width="13" height="9" rx="1.5" fill={reedBotB0 ? '#10b981' : '#475569'} />
                  <text x="9.5" y="-8.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={reedBotB0 ? '#059669' : '#64748b'}>
                    b0
                  </text>
                  <rect x="68" y="-6" width="13" height="9" rx="1.5" fill={reedBotB1 ? '#10b981' : '#475569'} />
                  <text x="74.5" y="-8.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={reedBotB1 ? '#059669' : '#64748b'}>
                    b1
                  </text>
                </g>

                {/* ==================== SENSORES ÓPTICOS CP1, CP2, CP3 ==================== */}
                {[
                  { x: 185, label: 'CP1', active: cp1Active },
                  { x: 345, label: 'CP2', active: cp2Active },
                  { x: 505, label: 'CP3', active: cp3Active }
                ].map(sensor => (
                  <g key={sensor.label} transform={`translate(${sensor.x}, 183)`}>
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="-18"
                      stroke={sensor.active ? '#10b981' : '#ef4444'}
                      strokeWidth={sensor.active ? 2 : 1.2}
                      strokeDasharray="2 2"
                    />
                    <rect x="-14" y="0" width="28" height="14" rx="2.5" fill="#0f172a" />
                    <circle cx="-7" cy="7" r="2.6" fill={sensor.active ? '#10b981' : '#475569'} />
                    {sensor.active && (
                      <circle cx="-7" cy="7" r="5" fill="#10b981" fillOpacity="0.3" />
                    )}
                    <text
                      x="4"
                      y="9.5"
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="bold"
                      fill={sensor.active ? '#34d399' : '#cbd5e1'}
                    >
                      {sensor.label}
                    </text>
                  </g>
                ))}

                {/* ==================== BOTELLAS EN ESTACIONES Y EN TRÁNSITO ==================== */}
                {/* Botella cargada por Cilindro A durante E3 */}
                {bottling.stage === 'E3' &&
                  renderBottleSvg(
                    112 + bottling.cylA * 73,
                    170,
                    { fillLevel: 0, isCapped: false },
                    'bottle-loading-a'
                  )}

                {/* Botella en Est. 1 (o moviéndose a Est. 2 durante E1) */}
                {bottling.slot1 &&
                  renderBottleSvg(
                    bottling.stage === 'E1' ? 185 + bottling.cylB * 160 : 185,
                    170,
                    bottling.slot1,
                    'bottle-slot-1'
                  )}

                {/* Botella en Est. 2 (o moviéndose a Est. 3 durante E1) */}
                {bottling.slot2 &&
                  renderBottleSvg(
                    bottling.stage === 'E1' ? 345 + bottling.cylB * 160 : 345,
                    170,
                    bottling.slot2,
                    'bottle-slot-2'
                  )}

                {/* Botella en Est. 3 (o saliendo hacia Salida durante E1) */}
                {bottling.slot3 &&
                  renderBottleSvg(
                    bottling.stage === 'E1' ? 505 + bottling.cylB * 82 : 505,
                    170,
                    bottling.slot3,
                    'bottle-slot-3'
                  )}

                {/* Etiqueta Salida */}
                <g transform="translate(578, 185)">
                  <rect x="0" y="0" width="46" height="16" rx="3" fill="#ecfdf5" stroke="#10b981" strokeWidth="1" />
                  <text x="23" y="10.5" textAnchor="middle" fontSize="6.8" fontWeight="bold" fill="#047857">
                    SALIDA OK
                  </text>
                </g>
              </svg>
            )}
          </div>

          {/* Consola GEMMA + Telemetría + Mandos HMI */}
          <div className="p-3 bg-slate-50 space-y-2.5">
            {/* Alerta Roja PE (D1) */}
            {(isPE || peAlertNotice) && (
              <div className="px-3 py-2 rounded-xl bg-rose-600 text-white text-[11px] font-bold flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-200 animate-pulse shrink-0" />
                  <span>
                    PARO DE EMERGENCIA (D1) ACTIVO — Libera PE y pulsa Rearme (A6)
                  </span>
                </div>
                {!isPE && (
                  <button
                    onClick={() => setPeAlertNotice(false)}
                    className="text-rose-100 hover:text-white cursor-pointer"
                    title="Cerrar aviso"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Consola GEMMA Industrial */}
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Selector de Modo GEMMA */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {gemmaModes.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectGemmaMode(m.id)}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                        activeGemmaMode === m.id
                          ? m.id === 'MAN'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      {m.label} <span className="opacity-75">{m.code}</span>
                    </button>
                  ))}
                </div>

                {/* Botones de Seguridad y Conducción GEMMA */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={handleTogglePE}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                      isPE
                        ? 'bg-rose-600 text-white border-rose-800 ring-2 ring-rose-300 shadow-sm'
                        : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>{isPE ? 'PE LIBERAR' : 'PE (D1)'}</span>
                  </button>

                  <button
                    onClick={handleRearm}
                    disabled={isPE}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-white border border-amber-600 flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isRearming ? 'Home A6...' : 'Rearme (A6)'}</span>
                  </button>

                  <button
                    onClick={handleCyclePulse}
                    disabled={isPE}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors disabled:opacity-40 cursor-pointer ${
                      activeGemmaMode === 'CL'
                        ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-700 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Repeat className="w-3 h-3" />
                    <span>+1 Ciclo (Dcy)</span>
                  </button>

                  <button
                    onClick={handleStepPulse}
                    disabled={isPE}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors disabled:opacity-40 cursor-pointer ${
                      activeGemmaMode === 'ET'
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    <StepForward className="w-3 h-3" />
                    <span>+1 Etapa (Bp)</span>
                  </button>
                </div>
              </div>

              {/* Tira de Jogs Manuales cuando activeGemmaMode === 'MAN' */}
              {activeGemmaMode === 'MAN' && !isPE && (
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 mr-1">
                    <Sliders className="w-3 h-3" />
                    <span>MAN (F4):</span>
                  </span>

                  {!isSimRunning && (
                    <span className="text-[10px] font-medium text-amber-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Inicia Simulación para accionar actuadores</span>
                    </span>
                  )}

                  {isSimRunning && plantMode === 'bottling' && (
                    <>
                      {(
                        [
                          { key: 'cylA', label: 'A+ / A-' },
                          { key: 'cylB', label: 'B+ / B-' },
                          { key: 'cylC', label: 'C+ / C-' },
                          { key: 'valveD', label: 'D+ (V7)' },
                          { key: 'cylE', label: 'E+ / E-' },
                          { key: 'motorF', label: 'F+ (V8)' },
                          { key: 'cylG', label: 'G+ / G-' }
                        ] as Array<{ key: keyof ManualBottlingTargets; label: string }>
                      ).map(item => {
                        const active = manBottlingTargets[item.key];
                        return (
                          <button
                            key={item.key}
                            onClick={() => toggleManualBottling(item.key)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                              active
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                active ? 'bg-white' : 'bg-slate-400'
                              }`}
                            />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {isSimRunning && plantMode === 'pneumatic' && (
                    <>
                      <button
                        onClick={() => {
                          userStoppedRef.current = false;
                          manPneumaticTargetRef.current = 'extend';
                          setManPneumaticTarget('extend');
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer ${
                          manPneumaticTarget === 'extend'
                            ? 'bg-sky-600 text-white border-sky-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        A+ (Y1)
                      </button>
                      <button
                        onClick={() => {
                          userStoppedRef.current = false;
                          manPneumaticTargetRef.current = 'retract';
                          setManPneumaticTarget('retract');
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer ${
                          manPneumaticTarget === 'retract'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        A- (Y2)
                      </button>
                    </>
                  )}

                  {isSimRunning && plantMode === 'conveyor' && (
                    <>
                      <button
                        onClick={() => {
                          userStoppedRef.current = false;
                          const next = !manConveyorRef.current;
                          manConveyorRef.current = next;
                          setManConveyorOn(next);
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer ${
                          manConveyorOn
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        Banda {manConveyorOn ? 'ON' : 'OFF'}
                      </button>
                      <button
                        onClick={() => {
                          userStoppedRef.current = false;
                          const next = !manDiverterRef.current;
                          manDiverterRef.current = next;
                          setManDiverterOn(next);
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer ${
                          manDiverterOn
                            ? 'bg-sky-600 text-white border-sky-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        Empujador Y1: {manDiverterOn ? 'ON' : 'OFF'}
                      </button>
                    </>
                  )}

                  {isSimRunning && plantMode === 'tank' && (
                    <>
                      <button
                        onClick={() => {
                          userStoppedRef.current = false;
                          const next = !manTankPumpRef.current;
                          manTankPumpRef.current = next;
                          setManTankPumpOn(next);
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer ${
                          manTankPumpOn
                            ? 'bg-sky-600 text-white border-sky-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        Bomba {manTankPumpOn ? 'ON' : 'OFF'}
                      </button>
                      <button
                        onClick={() => setDrainValveOpen(v => !v)}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer ${
                          drainValveOpen
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        Válvula Salida: {drainValveOpen ? 'ON' : 'OFF'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Telemetría por Planta */}
            {plantMode === 'conveyor' && (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Motor (-KM1)</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      isConveyorDriving ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {isConveyorDriving ? 'MARCHA' : 'PARADO'}
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
                  <div className="text-[10px] text-slate-500 font-semibold">Etapa / GEMMA</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      isPE
                        ? 'text-rose-600'
                        : isBottlingAutoDrive
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {bottling.stage} · {effectiveGemmaCode}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {BOTTLING_STAGE_LABELS[bottling.stage]}
                  </div>
                </div>

                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Cilindros A · B · C</div>
                  <div className="text-[10px] font-mono font-bold text-sky-700">
                    {Math.round(bottling.cylA * 100)}% · {Math.round(bottling.cylB * 100)}% ·{' '}
                    {Math.round(bottling.cylC * 100)}%
                  </div>
                  <div className="text-[9px] font-mono text-emerald-700">
                    {reedBotA1 ? 'a1' : 'a0'} {reedBotB1 ? 'b1' : 'b0'} {reedBotC1 ? 'c1' : 'c0'}
                  </div>
                </div>

                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Cilindros E · G · V7/V8</div>
                  <div className="text-[10px] font-mono font-bold text-slate-700">
                    {reedBotE1 ? 'e1' : 'e0'} {reedBotG1 ? 'g1' : 'g0'}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-0.5 text-[9px] font-mono font-bold">
                    <span
                      className={`px-1 rounded ${
                        bottling.valveD
                          ? 'bg-cyan-100 text-cyan-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      D+:{bottling.valveD ? 'ON' : '0'}
                    </span>
                    <span
                      className={`px-1 rounded ${
                        bottling.motorF
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      F+:{bottling.motorF ? 'ON' : '0'}
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Botellas OK</div>
                  <div className="text-xs font-mono font-bold text-sky-700">{bottledCount}</div>
                  <div className="text-[9px] font-mono text-slate-400">
                    CP1:{cp1Active ? '1' : '0'} CP2:{cp2Active ? '1' : '0'} CP3:{cp3Active ? '1' : '0'}
                  </div>
                </div>
              </div>
            )}

            {/* Barra de Mandos Locales HMI */}
            <div className="pt-1 border-t border-slate-200 flex items-center gap-2">
              <button
                onClick={handleStartClick}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>I — Marcha (-S1)</span>
              </button>

              <button
                onClick={handleStopClick}
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
