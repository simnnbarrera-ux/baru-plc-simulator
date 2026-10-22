import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CircuitDocument, PlacedComponent, WireSegment, WireType } from './types/circuit';
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
import { CadParser } from './core/format/cadParser';
import { AlertOctagon, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const App: React.FC = () => {
  // Estado del documento esquemático (iniciado con el arranque directo trifásico interactivo)
  const [doc, setDoc] = useState<CircuitDocument>(DIRECT_STARTER_CIRCUIT);

  // Historial de Deshacer y Rehacer (Pila limitada a los últimos 40 estados)
  const MAX_HISTORY = 40;
  const [pastDocs, setPastDocs] = useState<CircuitDocument[]>([]);
  const [futureDocs, setFutureDocs] = useState<CircuitDocument[]>([]);

  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

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
  const [selectedWire, setSelectedWire] = useState<WireSegment | null>(null);
  const [editingComponent, setEditingComponent] = useState<PlacedComponent | null>(null);

  // Modales y Herramientas Pro
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTwinOpen, setIsTwinOpen] = useState<boolean>(false);
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

  // Referencias a lienzo, solver y selector de archivos
  const canvasRef = useRef<SchematicCanvasRef | null>(null);
  const solverRef = useRef<CircuitSolver | null>(null);
  const plcOutputsRef = useRef<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sistema de notificaciones Toast no intrusivas
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Actualización de documento con registro atómico en el historial de Deshacer/Rehacer
  const updateDocWithHistory = useCallback((
    newDocOrUpdater: CircuitDocument | ((prev: CircuitDocument) => CircuitDocument),
    saveHistory = true,
    previousDocSnapshot?: CircuitDocument
  ) => {
    setDoc(prev => {
      const nextDoc = typeof newDocOrUpdater === 'function' ? newDocOrUpdater(prev) : newDocOrUpdater;
      if (saveHistory) {
        const snapshot = previousDocSnapshot 
          ? JSON.parse(JSON.stringify(previousDocSnapshot)) 
          : JSON.parse(JSON.stringify(prev));
        setPastDocs(p => [...p, snapshot].slice(-MAX_HISTORY));
        setFutureDocs([]);
      }
      return nextDoc;
    });
  }, []);

  // Función Deshacer (Ctrl+Z)
  const handleUndo = useCallback(() => {
    setPastDocs(prevPast => {
      if (prevPast.length === 0) return prevPast;
      const previousDoc = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setFutureDocs(prevFuture => [JSON.parse(JSON.stringify(docRef.current)), ...prevFuture].slice(0, MAX_HISTORY));
      setDoc(previousDoc);
      setSelectedComponent(null);
      setSelectedWire(null);
      showToast('Deshecho (Ctrl+Z)', 'info');
      return newPast;
    });
  }, [showToast]);

  // Función Rehacer (Ctrl+Y / Ctrl+Shift+Z)
  const handleRedo = useCallback(() => {
    setFutureDocs(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;
      const nextDoc = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPastDocs(prevPast => [...prevPast, JSON.parse(JSON.stringify(docRef.current))].slice(-MAX_HISTORY));
      setDoc(nextDoc);
      setSelectedComponent(null);
      setSelectedWire(null);
      showToast('Rehecho (Ctrl+Y)', 'info');
      return newFuture;
    });
  }, [showToast]);

  // Borrado de elemento o cable seleccionado (Supr / Delete)
  const handleDeleteSelection = useCallback(() => {
    if (selectedWire) {
      const remainingWires = doc.wires.filter(w => w.id !== selectedWire.id);
      const updatedJunctions = doc.junctions.filter(j => {
        let count = 0;
        for (const w of remainingWires) {
          if ((w.fromX === j.x && w.fromY === j.y) || (w.toX === j.x && w.toY === j.y)) count++;
        }
        return count >= 2;
      });
      updateDocWithHistory({
        ...doc,
        wires: remainingWires,
        junctions: updatedJunctions
      }, true);
      setSelectedWire(null);
      showToast('Cable conductor eliminado', 'info');
      return;
    }

    if (selectedComponent) {
      updateDocWithHistory({
        ...doc,
        components: doc.components.filter(c => c.id !== selectedComponent.id)
      }, true);
      const tag = selectedComponent.tag;
      setSelectedComponent(null);
      showToast(`Componente ${tag} eliminado`, 'info');
      return;
    }
  }, [selectedWire, selectedComponent, doc, updateDocWithHistory, showToast]);

  // Escucha de atajos de teclado globales para Deshacer (Ctrl+Z) y Rehacer (Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const modifier = e.ctrlKey || e.metaKey;
      if (!modifier) return;

      // Ctrl+Z (sin Shift) -> Deshacer
      if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y o Ctrl+Shift+Z -> Rehacer
      if ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleSetTool = useCallback((tool: string | null) => {
    setActiveTool(tool);
    if (tool === 'wire' && !selectedWireType) {
      setSelectedWireType('phase1');
    }
  }, [selectedWireType]);

  // Apertura directa con selector nativo de archivos del sistema operativo
  const handleDirectOpen = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          setSimulationState(prev => ({ ...prev, mode: 'stopped' }));
          updateDocWithHistory(parsed, true);
          setSelectedComponent(null);
          setSelectedWire(null);
          showToast(`Esquema cargado: ${file.name} (${parsed.components?.length || 0} componentes)`, 'success');
          setTimeout(() => canvasRef.current?.fitToScreen(), 150);
        } else {
          const parsed = CadParser.parse(text);
          setSimulationState(prev => ({ ...prev, mode: 'stopped' }));
          updateDocWithHistory(parsed, true);
          setSelectedComponent(null);
          setSelectedWire(null);
          showToast(`Esquema CADe_SIMU cargado: ${file.name} (${parsed.components?.length || 0} componentes)`, 'success');
          setTimeout(() => canvasRef.current?.fitToScreen(), 150);
        }
      } catch (err: any) {
        showToast(`Error al abrir archivo: ${err.message || 'Formato no reconocido'}`, 'error');
      }
    };
    reader.readAsText(file);
  }, [showToast, updateDocWithHistory]);

  // Guardado directo sin modal confuso (descarga directa del archivo .cad)
  const handleDirectSave = useCallback(() => {
    try {
      const cadText = CadParser.export(doc);
      const blob = new Blob([cadText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (doc.titleBlock?.title || 'esquema').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${safeTitle}.cad`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Esquema guardado exitosamente como "${filename}"`, 'success');
    } catch (err: any) {
      showToast(`Error al guardar: ${err.message}`, 'error');
    }
  }, [doc, showToast]);

  const handleExportCad = useCallback(() => {
    handleDirectSave();
  }, [handleDirectSave]);

  const handleExportJson = useCallback(() => {
    try {
      const jsonText = JSON.stringify(doc, null, 2);
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (doc.titleBlock?.title || 'esquema').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${safeTitle}.json`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Esquema exportado como JSON ("${filename}")`, 'success');
    } catch (err: any) {
      showToast(`Error al exportar JSON: ${err.message}`, 'error');
    }
  }, [doc, showToast]);

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
    soundEffects.playTripClick();
    setDoc(prev => {
      const nextComponents = prev.components.map(c => {
        if (c.id === compId) {
          return {
            ...c,
            state: { ...c.state, isActuated: isPressed }
          };
        }
        return c;
      });
      if (solverRef.current) {
        solverRef.current.setComponents(nextComponents);
      }
      return {
        ...prev,
        components: nextComponents
      };
    });

    if (solverRef.current && simulationState.mode === 'running') {
      setSimulationState(prev => solverRef.current!.step(prev, 16));
    }
  };

  // Selección de componentes desde la Ribbon
  const handleSelectComponentFromRibbon = (compType: string) => {
    const def = COMPONENT_CATALOG.find(c => c.type === compType);
    if (!def) return;

    const newComp: PlacedComponent = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: compType,
      tag: `${def.defaultTag}${doc.components.length + 1}`,
      x: Math.max(2, coords.x || 15),
      y: Math.max(2, coords.y || 15),
      rotation: 0,
      state: { isOpen: false, isActuated: false }
    };

    updateDocWithHistory(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }), true);
    setSelectedComponent(newComp);
    setSelectedWire(null);
    setActiveTool('select');
  };

  const handleSelectWire = (wType: WireType) => {
    setSelectedWireType(wType);
    setActiveTool('wire');
  };

  // Carga de circuitos de ejemplo
  const handleLoadExample = (exampleId: string) => {
    handleStopSimulation();
    let nextCircuit = DIRECT_STARTER_CIRCUIT;
    if (exampleId === 'direct') nextCircuit = DIRECT_STARTER_CIRCUIT;
    if (exampleId === 'star_delta') nextCircuit = STAR_DELTA_CIRCUIT;
    if (exampleId === 'reverse') nextCircuit = REVERSE_STARTER_CIRCUIT;
    if (exampleId === 'conveyor') nextCircuit = CONVEYOR_BELT_CIRCUIT;
    if (exampleId === 'water_tank') nextCircuit = WATER_TANK_PUMP_CIRCUIT;

    updateDocWithHistory(nextCircuit, true);
    setSelectedComponent(null);
    setSelectedWire(null);
  };

  const handleNewDocument = () => {
    handleStopSimulation();
    updateDocWithHistory({
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
    }, true);
    setSelectedComponent(null);
    setSelectedWire(null);
  };

  // Asegurar que la ventana nunca tenga scroll desfasado
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f0f2f5] text-slate-800 font-sans">
      {/* 1. Barra de Menús Superior */}
      <MenuBar
        canUndo={pastDocs.length > 0}
        canRedo={futureDocs.length > 0}
        hasSelection={!!selectedComponent || !!selectedWire}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDeleteSelection={handleDeleteSelection}
        onNew={handleNewDocument}
        onOpen={handleDirectOpen}
        onSave={handleDirectSave}
        onExportCad={handleExportCad}
        onExportJson={handleExportJson}
        onLoadExample={handleLoadExample}
        onAbout={() => setIsAboutOpen(true)}
        onOpenAdvanced={() => setIsImportExportOpen(true)}
      />

      {/* 2. Barra de Acciones y Controles Rápidos */}
      <ToolBar
        activeTool={activeTool}
        simulationMode={simulationState.mode}
        canUndo={pastDocs.length > 0}
        canRedo={futureDocs.length > 0}
        hasSelection={!!selectedComponent || !!selectedWire}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDeleteSelection={handleDeleteSelection}
        onSetTool={handleSetTool}
        onNew={handleNewDocument}
        onOpen={handleDirectOpen}
        onSave={handleDirectSave}
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
        isFaultsOpen={isFaultsOpen}
        onToggleFaults={() => setIsFaultsOpen(!isFaultsOpen)}
        hasActiveFault={activeFaults.size > 0}
        isExamActive={examSession.isActive}
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
          selectedWireId={selectedWire?.id || null}
          onSetTool={handleSetTool}
          onUpdateDocument={(newDoc, saveHistory = true, prevSnapshot) => {
            updateDocWithHistory(newDoc, saveHistory, prevSnapshot);
          }}
          onComponentSelect={(c) => {
            setSelectedComponent(c);
            if (c) setSelectedWire(null);
          }}
          onWireSelect={(w) => {
            setSelectedWire(w);
            if (w) setSelectedComponent(null);
          }}
          onComponentEdit={setEditingComponent}
          onCoordinatesChange={(x, y) => setCoords({ x, y })}
          onToggleBreaker={handleToggleBreaker}
          onPressButton={handlePressButton}
        />

        {/* Indicador Flotante de Averías Inyectadas en el Circuito */}
        {activeFaults.size > 0 && !examSession.isActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-rose-600/95 backdrop-blur-xs text-white text-xs font-bold rounded-full shadow-xl border border-rose-400 animate-in fade-in duration-200 select-none">
            <AlertOctagon className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            <span>
              {activeFaults.size === 1
                ? `Avería Activa: ${Array.from(activeFaults).map(f => FAULT_CATALOG.find(cat => cat.id === f)?.shortName || f).join(', ')}`
                : `${activeFaults.size} Averías Activas en Simulación`}
            </span>
            <button
              onClick={() => setIsFaultsOpen(true)}
              className="px-2 py-0.5 ml-1 bg-white hover:bg-slate-100 text-rose-700 text-[11px] font-extrabold rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Inspeccionar
            </button>
            <button
              onClick={handleResetFaults}
              className="px-2 py-0.5 bg-rose-800 hover:bg-rose-900 text-rose-100 text-[11px] rounded-md transition-colors cursor-pointer"
            >
              Restablecer
            </button>
          </div>
        )}

        {/* Alerta crítica de cortocircuito franco */}
        {shortCircuitAlert && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 bg-red-700 text-white text-xs font-black rounded-lg shadow-2xl border-2 border-amber-400 animate-bounce select-none">
            <AlertOctagon className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{shortCircuitAlert}</span>
          </div>
        )}

        {/* Gemelo Digital 2D de Planta Virtual (tipo PC_SIMU) */}
        <DigitalTwinPlant
          simulationState={simulationState}
          onPressButton={(btnKey, isPressed) => {
            const targets = doc.components.filter(c => {
              if (btnKey === 'btn_start') {
                return (
                  c.id === 'btn_start' ||
                  c.id === 'btn_start_cw' ||
                  c.tag === '-S1' ||
                  c.tag === 'I' ||
                  (c.type === 'button_no' && (c.tag === '-S1' || c.tag === 'I' || c.tag.includes('1')))
                );
              }
              if (btnKey === 'btn_stop') {
                return (
                  c.id === 'btn_stop' ||
                  c.id === 'btn_es' ||
                  c.tag === '-S0' ||
                  c.tag === '-S2' ||
                  c.tag === 'O' ||
                  c.type === 'button_nc' ||
                  c.type === 'emergency_stop' ||
                  (c.tag && (c.tag.toLowerCase().includes('stop') || c.tag.toLowerCase().includes('parada')))
                );
              }
              return false;
            });

            if (targets.length > 0) {
              targets.forEach(target => handlePressButton(target.id, isPressed));
            } else {
              const fallback = doc.components.find(c => 
                btnKey === 'btn_start' 
                  ? c.type === 'button_no' 
                  : (c.type === 'button_nc' || c.type === 'emergency_stop')
              );
              if (fallback) handlePressButton(fallback.id, isPressed);
            }
          }}
          isOpen={isTwinOpen}
          onClose={() => setIsTwinOpen(false)}
        />

        {/* Analizador Lógico & Cronograma de Señales */}
        <TimingDiagram
          simulationState={simulationState}
          document={doc}
          isOpen={isTimingOpen}
          onClose={() => setIsTimingOpen(false)}
        />

        {/* Multímetro Industrial Fluke */}
        <VirtualMultimeter
          simulationState={simulationState}
          isOpen={isMeterOpen}
          onClose={() => setIsMeterOpen(false)}
          activeFaults={activeFaults}
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
            updateDocWithHistory(prev => ({
              ...prev,
              components: prev.components.map(c => c.id === updated.id ? updated : c)
            }), true);
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
            updateDocWithHistory(newDoc, true);
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

      {/* Inyector & Diagnóstico Didáctico de Averías Eléctricas y Modo Examen */}
      <FaultInjectorModal
        isOpen={isFaultsOpen}
        onClose={() => setIsFaultsOpen(false)}
        activeFaults={activeFaults}
        onToggleFault={handleToggleFault}
        onResetFaults={handleResetFaults}
        examSession={examSession}
        onStartExam={handleStartExam}
        onSubmitExamAnswer={handleSubmitExamAnswer}
        onResetExam={handleResetExam}
        onOpenMultimeter={() => setIsMeterOpen(true)}
        simulationState={simulationState}
      />

      {/* Selector nativo de archivos para Abrir (.cad / .json) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".cad,.json,.txt"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Notificación Toast flotante de retroalimentación limpia */}
      {toast && (
        <div className={`fixed bottom-10 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-2xl text-xs font-semibold select-none animate-in fade-in slide-in-from-bottom-3 duration-200 ${
          toast.type === 'error'
            ? 'bg-rose-700 text-white border border-rose-500'
            : toast.type === 'info'
              ? 'bg-blue-700 text-white border border-blue-500'
              : 'bg-slate-900/95 text-emerald-400 border border-emerald-500/60 backdrop-blur-md'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="w-4 h-4 text-white shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
