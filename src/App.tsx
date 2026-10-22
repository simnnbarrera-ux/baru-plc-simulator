import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CircuitDocument, PlacedComponent, WireType } from './types/circuit';
import { SimulationState } from './types/simulation';
import { CircuitSolver } from './core/simulation/solver';
import { 
  DIRECT_STARTER_CIRCUIT, 
  STAR_DELTA_CIRCUIT, 
  REVERSE_STARTER_CIRCUIT, 
  CONVEYOR_BELT_CIRCUIT, 
  WATER_TANK_PUMP_CIRCUIT 
} from './core/examples';
import { MenuBar } from './components/layout/MenuBar';
import { ToolBar } from './components/layout/ToolBar';
import { ComponentRibbon } from './components/layout/ComponentRibbon';
import { StatusBar } from './components/layout/StatusBar';
import { SchematicCanvas, SchematicCanvasRef } from './components/canvas/SchematicCanvas';
import { ComponentEditModal } from './components/dialogs/ComponentEditModal';
import { ImportExportModal } from './components/dialogs/ImportExportModal';
import { AboutModal } from './components/dialogs/AboutModal';
import { DigitalTwinPlant } from './components/plant/DigitalTwinPlant';
import { TimingDiagram } from './components/tools/TimingDiagram';
import { VirtualMultimeter } from './components/tools/VirtualMultimeter';
import { LabReportModal } from './components/dialogs/LabReportModal';
import { LadderEditorModal } from './components/plc/LadderEditorModal';
import { FaultInjectorModal } from './components/tools/FaultInjectorModal';
import { FaultId, FAULT_CATALOG, ExamSession } from './types/faults';
import { COMPONENT_CATALOG } from './core/components/catalog';
import { soundEffects } from './core/simulation/soundEffects';
import { AlertOctagon } from 'lucide-react';

export const App: React.FC = () => {
  // Estado del documento esquemático (iniciado con el arranque directo trifásico interactivo)
  const [doc, setDoc] = useState<CircuitDocument>(DIRECT_STARTER_CIRCUIT);

  // Estado del motor de simulación
  const [simulationState, setSimulationState] = useState<SimulationState>({
    mode: 'stopped',
    simulationTime: 0,
    stepCount: 0,
    fps: 60,
    activeCoils: new Set<string>(),
    energizedWires: new Set<string>(),
    energizedPins: new Set<string>(),
    timerStates: new Map(),
    motorStates: new Map(),
    pilotLights: new Map()
  });

  // Herramientas y selección
  const [activeTool, setActiveTool] = useState<string | null>('select');
  const [selectedWireType, setSelectedWireType] = useState<WireType | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<PlacedComponent | null>(null);
  const [editingComponent, setEditingComponent] = useState<PlacedComponent | null>(null);

  // Modales y Herramientas Pro
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTwinOpen, setIsTwinOpen] = useState<boolean>(true); // Abierto por defecto para impacto inmediato
  const [isTimingOpen, setIsTimingOpen] = useState<boolean>(false);
  const [isMeterOpen, setIsMeterOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isLadderOpen, setIsLadderOpen] = useState<boolean>(false);
  const [isFaultsOpen, setIsFaultsOpen] = useState<boolean>(false);

  // Sistema de inyección didáctica de fallas y examen oficial
  const [activeFaults, setActiveFaults] = useState<Set<string>>(new Set());
  const [shortCircuitAlert, setShortCircuitAlert] = useState<string | null>(null);
  const [examSession, setExamSession] = useState<ExamSession>({
    isActive: false,
    hiddenFaultId: null,
    startedAt: null,
    attempts: 0,
    submittedAnswer: null,
    isPassed: null,
    score: null,
    feedback: null,
    studentNotes: ''
  });

  // Coordenadas actuales del ratón
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Referencias a lienzo y solver
  const canvasRef = useRef<SchematicCanvasRef | null>(null);
  const solverRef = useRef<CircuitSolver | null>(null);
  const plcOutputsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    solverRef.current = new CircuitSolver(doc.components, doc.wires, doc.junctions, activeFaults);
  }, [doc, activeFaults]);

  // Manejo pedagógico de inyección de averías
  const handleToggleFault = useCallback((faultId: FaultId) => {
    setActiveFaults(prev => {
      const next = new Set(prev);
      if (next.has(faultId)) {
        next.delete(faultId);
      } else {
        next.add(faultId);
        // Si se inyecta cortocircuito franco, disparo magnético instantáneo en -Q1
        if (faultId === 'short_circuit') {
          setDoc(d => ({
            ...d,
            components: d.components.map(c => {
              if (c.type === 'breaker_3p' || c.tag === '-Q1') {
                return { ...c, state: { ...c.state, isOpen: true } };
              }
              return c;
            })
          }));
          soundEffects.playShortCircuitBang();
          setShortCircuitAlert("¡DISPARO MAGNÉTICO INSTANTÁNEO EN -Q1! Cortocircuito franco presente.");
          setTimeout(() => setShortCircuitAlert(null), 4500);
        }
      }
      return next;
    });
  }, []);

  const handleResetFaults = useCallback(() => {
    setActiveFaults(new Set());
    setShortCircuitAlert(null);
  }, []);

  const handleStartExam = useCallback((hiddenFaultId: FaultId) => {
    setActiveFaults(new Set([hiddenFaultId]));
    if (hiddenFaultId === 'short_circuit') {
      setDoc(d => ({
        ...d,
        components: d.components.map(c => {
          if (c.type === 'breaker_3p' || c.tag === '-Q1') {
            return { ...c, state: { ...c.state, isOpen: true } };
          }
          return c;
        })
      }));
      soundEffects.playShortCircuitBang();
    }
    setExamSession({
      isActive: true,
      hiddenFaultId,
      startedAt: Date.now(),
      attempts: 0,
      submittedAnswer: null,
      isPassed: null,
      score: null,
      feedback: null,
      studentNotes: ''
    });
  }, []);

  const handleSubmitExamAnswer = useCallback((answer: FaultId, notes: string) => {
    setExamSession(prev => {
      const isCorrect = answer === prev.hiddenFaultId;
      const attempts = prev.attempts + 1;
      const score = isCorrect ? Math.max(3.0, 5.0 - (attempts - 1) * 0.5) : 2.0;
      
      let feedback = '';
      if (isCorrect) {
        soundEffects.playSuccessChime();
        feedback = `¡Excelente diagnóstico técnico! Has determinado con precisión que la avería es: ${FAULT_CATALOG.find(f => f.id === answer)?.name}. El análisis y comprobación con instrumentos cumplen las directrices técnicas y la normativa IEC 60947.`;
      } else {
        soundEffects.playErrorBuzzer();
        feedback = `Diagnóstico incorrecto. Los síntomas eléctricos en bornas no se corresponden con ${FAULT_CATALOG.find(f => f.id === answer)?.shortName}. Utiliza el multímetro y el comprobador de tensión para verificar la presencia de fases o continuidad de contactos.`;
      }

      return {
        ...prev,
        attempts,
        submittedAnswer: answer,
        isPassed: isCorrect,
        score,
        feedback,
        studentNotes: notes
      };
    });
  }, []);

  const handleResetExam = useCallback(() => {
    setActiveFaults(new Set());
    setShortCircuitAlert(null);
    setExamSession({
      isActive: false,
      hiddenFaultId: null,
      startedAt: null,
      attempts: 0,
      submittedAnswer: null,
      isPassed: null,
      score: null,
      feedback: null,
      studentNotes: ''
    });
  }, []);

  // Manejo de salidas del PLC y sincronización bidireccional
  const handlePlcOutputsChange = useCallback((outputs: Record<string, boolean>) => {
    plcOutputsRef.current = outputs;
    setSimulationState(prev => {
      const activeCoils = new Set(prev.activeCoils);
      const pilotLights = new Map(prev.pilotLights);
      const motorStates = new Map(prev.motorStates);

      if (outputs['%Q0.0']) {
        activeCoils.add('-KM1');
        const m = motorStates.get('mot_1') || { rpm: 0, targetRpm: 1450, direction: 1 as const, angle: 0, hasError: false };
        motorStates.set('mot_1', { ...m, targetRpm: 1450, direction: 1 });
      }

      if (outputs['%Q0.1']) {
        pilotLights.set('pilot_run', { color: 'green', isLit: true });
      }

      return {
        ...prev,
        activeCoils,
        pilotLights,
        motorStates
      };
    });
  }, []);

  // Bucle de Simulación a 60 FPS cuando está en modo 'running'
  useEffect(() => {
    if (simulationState.mode !== 'running') return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const deltaMs = Math.min(now - lastTime, 50);
      lastTime = now;

      if (solverRef.current) {
        setSimulationState(prev => {
          const next = solverRef.current!.step(prev, deltaMs);
          if (plcOutputsRef.current['%Q0.0']) {
            next.activeCoils.add('-KM1');
            const m = next.motorStates.get('mot_1') || { rpm: 0, targetRpm: 1450, direction: 1 as const, angle: 0, hasError: false };
            next.motorStates.set('mot_1', { ...m, targetRpm: 1450, direction: 1 });
          }
          if (plcOutputsRef.current['%Q0.1']) {
            next.pilotLights.set('pilot_run', { color: 'green', isLit: true });
          }
          return next;
        });
      }
    }, 33); // ~30 Hz de cálculo nodal

    return () => clearInterval(interval);
  }, [simulationState.mode]);

  // Controles de Simulación
  const handleStartSimulation = () => {
    setSimulationState(prev => ({
      ...prev,
      mode: 'running',
      simulationTime: 0,
      activeCoils: new Set(),
      energizedWires: new Set(),
      energizedPins: new Set(),
      timerStates: new Map(),
      motorStates: new Map(),
      pilotLights: new Map()
    }));
    setActiveTool('select');
  };

  const handleStopSimulation = () => {
    setSimulationState(prev => ({
      ...prev,
      mode: 'stopped',
      activeCoils: new Set(),
      energizedWires: new Set(),
      energizedPins: new Set(),
      timerStates: new Map(),
      motorStates: new Map(),
      pilotLights: new Map()
    }));
  };

  const handlePauseSimulation = () => {
    setSimulationState(prev => ({
      ...prev,
      mode: prev.mode === 'running' ? 'paused' : 'running'
    }));
  };

  const handleStepSimulation = () => {
    if (solverRef.current) {
      setSimulationState(prev => solverRef.current!.step(prev, 100));
    }
  };

  // Interacción en Simulación: Conmutar disyuntor/guardamotor
  const handleToggleBreaker = (compId: string) => {
    // Si hay cortocircuito franco presente, el guardamotor no puede cerrar (disparo magnético instantáneo)
    if (activeFaults.has('short_circuit')) {
      soundEffects.playShortCircuitBang();
      setShortCircuitAlert("¡DISPARO MAGNÉTICO INSTANTÁNEO EN -Q1! Imposible rearmar: Cortocircuito franco presente.");
      setTimeout(() => setShortCircuitAlert(null), 4500);

      setDoc(prev => ({
        ...prev,
        components: prev.components.map(c => {
          if (c.id === compId || c.type === 'breaker_3p') {
            return {
              ...c,
              state: { ...c.state, isOpen: true }
            };
          }
          return c;
        })
      }));
      return;
    }

    soundEffects.playTripClick();
    setDoc(prev => ({
      ...prev,
      components: prev.components.map(c => {
        if (c.id === compId) {
          const isOpen = c.state?.isOpen ?? false;
          return {
            ...c,
            state: { ...c.state, isOpen: !isOpen }
          };
        }
        return c;
      })
    }));
  };

  // Interacción en Simulación: Pulsar/Soltar botón
  const handlePressButton = (compId: string, isPressed: boolean) => {
    setDoc(prev => ({
      ...prev,
      components: prev.components.map(c => {
        if (c.id === compId) {
          return {
            ...c,
            state: { ...c.state, isActuated: isPressed }
          };
        }
        return c;
      })
    }));
  };

  // Selección de componentes desde la Ribbon
  const handleSelectComponentFromRibbon = (compType: string) => {
    const def = COMPONENT_CATALOG.find(c => c.type === compType);
    if (!def) return;

    // Colocar nuevo componente en una posición libre cerca de las coordenadas actuales o centro
    const newComp: PlacedComponent = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: compType,
      tag: `${def.defaultTag}${doc.components.length + 1}`,
      x: Math.max(2, coords.x || 15),
      y: Math.max(2, coords.y || 15),
      rotation: 0,
      state: { isOpen: false, isActuated: false }
    };

    setDoc(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
    setSelectedComponent(newComp);
    setActiveTool('select');
  };

  const handleSelectWire = (wType: WireType) => {
    setSelectedWireType(wType);
    setActiveTool('wire');
  };

  // Carga de circuitos de ejemplo
  const handleLoadExample = (exampleId: string) => {
    handleStopSimulation();
    if (exampleId === 'direct') setDoc(DIRECT_STARTER_CIRCUIT);
    if (exampleId === 'star_delta') setDoc(STAR_DELTA_CIRCUIT);
    if (exampleId === 'reverse') setDoc(REVERSE_STARTER_CIRCUIT);
    if (exampleId === 'conveyor') setDoc(CONVEYOR_BELT_CIRCUIT);
    if (exampleId === 'water_tank') setDoc(WATER_TANK_PUMP_CIRCUIT);
  };

  const handleNewDocument = () => {
    handleStopSimulation();
    setDoc({
      version: '1.0.0',
      gridSize: 20,
      titleBlock: {
        title: 'Nuevo Esquema Eléctrico',
        project: 'Automatismos Industriales',
        author: 'Simón Barrera Ruíz',
        date: new Date().toISOString().split('T')[0],
        sheet: '1/1',
        scale: '1:1',
        revision: '1.0',
        company: 'Sistemas de Automatización'
      },
      components: [],
      wires: [],
      junctions: []
    });
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#f0f2f5] text-slate-800 font-sans">
      {/* 1. Barra de Menús Superior */}
      <MenuBar
        onNew={handleNewDocument}
        onOpen={() => setIsImportExportOpen(true)}
        onSave={() => setIsImportExportOpen(true)}
        onExportCad={() => setIsImportExportOpen(true)}
        onExportJson={() => setIsImportExportOpen(true)}
        onLoadExample={handleLoadExample}
        onStartSimulation={handleStartSimulation}
        onStopSimulation={handleStopSimulation}
        isSimulating={simulationState.mode === 'running'}
        onAbout={() => setIsAboutOpen(true)}
        onOpenLadder={() => setIsLadderOpen(true)}
      />

      {/* 2. Barra de Acciones y Controles Rápidos */}
      <ToolBar
        activeTool={activeTool}
        simulationMode={simulationState.mode}
        onSetTool={setActiveTool}
        onNew={handleNewDocument}
        onOpen={() => setIsImportExportOpen(true)}
        onSave={() => setIsImportExportOpen(true)}
        onStartSimulation={handleStartSimulation}
        onStopSimulation={handleStopSimulation}
        onPauseSimulation={handlePauseSimulation}
        onStepSimulation={handleStepSimulation}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onFitScreen={() => canvasRef.current?.fitToScreen()}
        isTwinOpen={isTwinOpen}
        onToggleTwin={() => setIsTwinOpen(!isTwinOpen)}
        isTimingOpen={isTimingOpen}
        onToggleTiming={() => setIsTimingOpen(!isTimingOpen)}
        isMeterOpen={isMeterOpen}
        onToggleMeter={() => setIsMeterOpen(!isMeterOpen)}
        isLadderOpen={isLadderOpen}
        onToggleLadder={() => setIsLadderOpen(!isLadderOpen)}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* 3. Cinta de Componentes Categorizada */}
      <ComponentRibbon
        selectedTool={activeTool}
        selectedWireType={selectedWireType}
        onSelectComponent={handleSelectComponentFromRibbon}
        onSelectWire={handleSelectWire}
        onResetTool={() => { setActiveTool('select'); setSelectedWireType(null); }}
      />

      {/* 4. Área de Trabajo Principal (Lienzo Esquemático + Overlays Pro) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <SchematicCanvas
          ref={canvasRef}
          document={doc}
          simulationState={simulationState}
          activeWireType={selectedWireType}
          activeTool={activeTool}
          onUpdateDocument={setDoc}
          onComponentSelect={setSelectedComponent}
          onComponentEdit={setEditingComponent}
          onCoordinatesChange={(x, y) => setCoords({ x, y })}
          onToggleBreaker={handleToggleBreaker}
          onPressButton={handlePressButton}
        />

        {/* Gemelo Digital 2D de Planta Virtual (tipo PC_SIMU) */}
        <DigitalTwinPlant
          simulationState={simulationState}
          onPressButton={(btnKey, isPressed) => {
            const target = doc.components.find(c => 
              (btnKey === 'btn_start' && (c.id === 'btn_start' || c.type === 'button_no')) ||
              (btnKey === 'btn_stop' && (c.id === 'btn_stop' || c.type === 'button_nc'))
            );
            if (target) {
              handlePressButton(target.id, isPressed);
            }
          }}
          isOpen={isTwinOpen}
          onClose={() => setIsTwinOpen(false)}
        />

        {/* Analizador Lógico & Cronograma de Señales */}
        <TimingDiagram
          simulationState={simulationState}
          isOpen={isTimingOpen}
          onClose={() => setIsTimingOpen(false)}
        />

        {/* Multímetro Industrial Fluke */}
        <VirtualMultimeter
          simulationState={simulationState}
          isOpen={isMeterOpen}
          onClose={() => setIsMeterOpen(false)}
        />
      </div>

      {/* 5. Barra de Estado Inferior */}
      <StatusBar
        coordX={coords.x}
        coordY={coords.y}
        simulationState={simulationState}
        componentCount={doc.components.length}
        wireCount={doc.wires.length}
        activeTool={activeTool}
      />

      {/* Modales */}
      {editingComponent && (
        <ComponentEditModal
          component={editingComponent}
          isOpen={!!editingComponent}
          onClose={() => setEditingComponent(null)}
          onSave={updated => {
            setDoc(prev => ({
              ...prev,
              components: prev.components.map(c => c.id === updated.id ? updated : c)
            }));
          }}
        />
      )}

      {isImportExportOpen && (
        <ImportExportModal
          isOpen={isImportExportOpen}
          document={doc}
          onClose={() => setIsImportExportOpen(false)}
          onImportDocument={newDoc => {
            handleStopSimulation();
            setDoc(newDoc);
          }}
        />
      )}

      {isAboutOpen && (
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      )}

      {/* Memoria Técnica de Instalación & Lista de Materiales (BOM) */}
      <LabReportModal
        isOpen={isReportOpen}
        document={doc}
        onClose={() => setIsReportOpen(false)}
      />

      {/* Editor y Simulador de PLC Ladder & GRAFCET */}
      <LadderEditorModal
        isOpen={isLadderOpen}
        onClose={() => setIsLadderOpen(false)}
        document={doc}
        simulationState={simulationState}
        onUpdatePlcOutputs={handlePlcOutputsChange}
      />
    </div>
  );
};
