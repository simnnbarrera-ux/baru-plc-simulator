import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CircuitDocument, PlacedComponent, WireSegment, WireType } from './types/circuit';
import { ElectricalMeasurement, SimulationState } from './types/simulation';
import { CloudProject, CloudSyncStatus, ExamAttemptRecord } from './types/cloud';
import { CircuitSolver } from './core/simulation/solver';
import {
  PLC_S71200_STARTER_CIRCUIT,
  getExamplePreset
} from './core/examples';
import {
  DEFAULT_TIA_PROGRAM,
  GemmaMode,
  TiaProgramDocument,
  TiaRuntimeState,
  createInitialRuntime,
  stepTiaScanCycle
} from './core/plc/tiaEngine';
import { useAuth } from './contexts/AuthContext';
import {
  deleteCloudProject,
  duplicateCloudProject,
  fetchSharedProjectBySlug,
  listUserExamAttempts,
  listUserProjects,
  recordExamAttempt,
  saveProjectToCloud,
  toggleProjectSharing
} from './core/supabase/repository';
import { TinkerHeader, WorkspaceView } from './components/layout/TinkerHeader';
import { TinkerFloatingBar } from './components/canvas/TinkerFloatingBar';
import { TinkerInspector } from './components/canvas/TinkerInspector';
import { TinkerComponentDrawer } from './components/layout/TinkerComponentDrawer';
import { TiaWorkspaceView } from './components/plc/TiaWorkspaceView';
import { SchematicCanvas, SchematicCanvasRef } from './components/canvas/SchematicCanvas';
import { ComponentEditModal } from './components/dialogs/ComponentEditModal';
import { UnifiedExportModal, ExportModalTab } from './components/dialogs/UnifiedExportModal';
import { AboutModal } from './components/dialogs/AboutModal';
import { DigitalTwinPlant } from './components/plant/DigitalTwinPlant';
import { TimingDiagram } from './components/tools/TimingDiagram';
import { VirtualMultimeter } from './components/tools/VirtualMultimeter';
import { LabReportModal } from './components/dialogs/LabReportModal';
import { FaultInjectorModal } from './components/tools/FaultInjectorModal';
import { AuthModal, AuthModalMode } from './components/auth/AuthModal';
import { ProjectsModal, ProjectsModalTab } from './components/cloud/ProjectsModal';
import { SharedProjectBanner } from './components/cloud/SharedProjectBanner';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { LandingPage } from './components/landing/LandingPage';
import { FaultId, FAULT_CATALOG, ExamSession } from './types/faults';
import { COMPONENT_CATALOG } from './core/components/catalog';
import { soundEffects } from './core/simulation/soundEffects';
import { AlertOctagon, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';

const GUEST_ONBOARDING_SEEN_KEY = 'baru_guest_onboarding_seen_v1';
const SESSION_ONBOARDING_DONE_KEY = 'baru_onboarding_done_session_v1';

const createEmptyTiaProgram = (): TiaProgramDocument => ({
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'Main',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Pulsador_Marcha', dataType: 'Bool', schematicTag: '-S1', comment: 'Entrada digital I0.0' },
    { address: '%I0.1', name: 'Pulsador_Paro', dataType: 'Bool', schematicTag: '-S0', comment: 'Entrada digital I0.1' },
    { address: '%Q0.0', name: 'Salida_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Salida relé Q0.0' }
  ],
  rungs: [],
  sclCode: '// Nuevo bloque OB1 en SCL (IEC 61131-3)\n// Añade segmentos en LAD o escribe tu código SCL aquí\n',
  grafcetSteps: [
    { id: 0, name: 'E0', isInitial: true, actionTag: '', actionLabel: 'Etapa inicial (Reposo)' }
  ],
  grafcetTransitions: []
});

const createEmptySimulationState = (): SimulationState => ({
  mode: 'stopped',
  simulationTime: 0,
  stepCount: 0,
  fps: 60,
  activeCoils: new Set<string>(),
  energizedWires: new Set<string>(),
  energizedPins: new Set<string>(),
  timerStates: new Map(),
  motorStates: new Map(),
  pilotLights: new Map(),
  pneumaticStates: new Map()
});

export const App: React.FC = () => {
  const {
    user,
    profile,
    loading: authLoading,
    schemaMissing: authSchemaMissing,
    signOut,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    setOnboardingStep
  } = useAuth();

  // Documento esquemático + Programa TIA S7-1200 unificados
  const [doc, setDoc] = useState<CircuitDocument>(PLC_S71200_STARTER_CIRCUIT);
  const [tiaProgram, setTiaProgram] = useState<TiaProgramDocument>(DEFAULT_TIA_PROGRAM);
  const [tiaRuntime, setTiaRuntime] = useState<TiaRuntimeState>(() =>
    createInitialRuntime(DEFAULT_TIA_PROGRAM)
  );

  // Estado Cloud Supabase (Proyectos, Exámenes, Enlaces Compartidos, Autoguardado)
  const [activeCloudProjectId, setActiveCloudProjectId] = useState<string | null>(null);
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttemptRecord[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [repoSchemaMissing, setRepoSchemaMissing] = useState<boolean>(false);
  const [sharedBanner, setSharedBanner] = useState<{ title: string; slug: string } | null>(null);
  const [isCloningShared, setIsCloningShared] = useState<boolean>(false);

  // Modales Cloud / Auth / Onboarding / Landing
  const [enteredGuestWorkspace, setEnteredGuestWorkspace] = useState<boolean>(false);
  const hasShareParam = useMemo(
    () => Boolean(new URLSearchParams(window.location.search).get('share')?.trim()),
    []
  );
  const [authModalState, setAuthModalState] = useState<{
    open: boolean;
    mode: AuthModalMode;
    reason?: string | null;
  }>({ open: false, mode: 'login', reason: null });
  const [projectsModalTab, setProjectsModalTab] = useState<ProjectsModalTab | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardInitialStep, setWizardInitialStep] = useState<number>(1);
  const wizardAutoTriggeredUserRef = useRef<string | null>(null);
  const guestWizardTriggeredRef = useRef<boolean>(false);
  const isHydratingCloudRef = useRef<boolean>(false);

  // Vista estilo Tinkercad
  const [activeView, setActiveView] = useState<WorkspaceView>('cad');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  // Historial Deshacer / Rehacer
  const MAX_HISTORY = 40;
  const [pastDocs, setPastDocs] = useState<CircuitDocument[]>([]);
  const [futureDocs, setFutureDocs] = useState<CircuitDocument[]>([]);

  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const tiaProgramRef = useRef(tiaProgram);
  useEffect(() => {
    tiaProgramRef.current = tiaProgram;
  }, [tiaProgram]);

  const tiaRuntimeRef = useRef(tiaRuntime);
  useEffect(() => {
    tiaRuntimeRef.current = tiaRuntime;
  }, [tiaRuntime]);

  // Estado del motor de simulación eléctrica + neumática
  const [simulationState, setSimulationState] = useState<SimulationState>(createEmptySimulationState);
  const simStateRef = useRef<SimulationState>(simulationState);
  useEffect(() => {
    simStateRef.current = simulationState;
  }, [simulationState]);

  // Herramientas y selección
  const [activeTool, setActiveTool] = useState<string | null>('select');
  const [selectedWireType, setSelectedWireType] = useState<WireType | null>('phase1');
  const [selectedComponent, setSelectedComponent] = useState<PlacedComponent | null>(null);
  const [selectedWire, setSelectedWire] = useState<WireSegment | null>(null);
  const [editingComponent, setEditingComponent] = useState<PlacedComponent | null>(null);

  // Modales y Herramientas Avanzadas
  const [exportModalTab, setExportModalTab] = useState<ExportModalTab | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTimingOpen, setIsTimingOpen] = useState<boolean>(false);
  const [isMeterOpen, setIsMeterOpen] = useState<boolean>(false);
  const [isProbeActive, setIsProbeActive] = useState<boolean>(false);
  const [probedTarget, setProbedTarget] = useState<{
    kind: 'wire' | 'pin' | 'component';
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isFaultsOpen, setIsFaultsOpen] = useState<boolean>(false);

  // Sistema de inyección de fallas y examen
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

  // Coordenadas del cursor
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 15, y: 12 });

  // Referencias para co-simulación
  const canvasRef = useRef<SchematicCanvasRef | null>(null);
  const solverRef = useRef<CircuitSolver | null>(null);
  const plcInputsRef = useRef<Record<string, boolean>>({});
  const plcOutputsRef = useRef<Record<string, boolean>>({});

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3800);
  }, []);

  // --------------------------------------------------------------------------
  // Carga de Proyectos e Historial de Exámenes desde Supabase
  // --------------------------------------------------------------------------
  const refreshCloudData = useCallback(async (userId: string) => {
    setIsLoadingCloud(true);
    const [projRes, examRes] = await Promise.all([
      listUserProjects(userId),
      listUserExamAttempts(userId)
    ]);

    let missingSchema = false;
    if (projRes.success) {
      setCloudProjects(projRes.data);
    } else if (projRes.schemaMissing) {
      missingSchema = true;
    }

    if (examRes.success) {
      setExamAttempts(examRes.data);
    } else if (examRes.schemaMissing) {
      missingSchema = true;
    }

    setRepoSchemaMissing(missingSchema);
    setIsLoadingCloud(false);
  }, []);

  useEffect(() => {
    if (user?.id) {
      refreshCloudData(user.id);
    } else {
      setCloudProjects([]);
      setExamAttempts([]);
      setActiveCloudProjectId(null);
      setSyncStatus('idle');
      wizardAutoTriggeredUserRef.current = null;
    }
  }, [user?.id, refreshCloudData]);

  // --------------------------------------------------------------------------
  // Disparo Automático del Wizard de 5 Pasos:
  // - Primera vez que se abre el programa sin sesión (modo invitado, 1 sola vez)
  // - Primera vez que entra una cuenta nueva (persistido DB-First en profiles)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading) return;
    if (!user && !enteredGuestWorkspace) return;

    // Caso 1: Usuario autenticado -> Supabase profiles es la fuente de la verdad
    if (user && profile) {
      if (wizardAutoTriggeredUserRef.current === user.id) return;
      wizardAutoTriggeredUserRef.current = user.id;

      if (profile.onboarding_completed || profile.onboarding_skipped) {
        try {
          window.localStorage.setItem(
            GUEST_ONBOARDING_SEEN_KEY,
            profile.onboarding_completed ? 'completed' : 'skipped'
          );
        } catch {
          // Ignore storage quota errors
        }
        return;
      }

      // Si el usuario ya completó u omitió el tutorial como invitado en esta misma sesión,
      // sincronizamos su nuevo perfil en Supabase sin mostrarle el wizard por segunda vez.
      let sessionDone: string | null = null;
      try {
        sessionDone = window.sessionStorage.getItem(SESSION_ONBOARDING_DONE_KEY);
      } catch {
        sessionDone = null;
      }

      if (sessionDone === 'completed') {
        completeOnboarding();
        return;
      }
      if (sessionDone === 'skipped') {
        skipOnboarding();
        return;
      }

      if (!hasShareParam) {
        setWizardInitialStep(Math.min(5, Math.max(1, profile.onboarding_step || 1)));
        setIsWizardOpen(true);
      }
      return;
    }

    // Caso 2: Invitado abriendo el programa por primera vez en este navegador
    if (!user && enteredGuestWorkspace && !guestWizardTriggeredRef.current && !hasShareParam) {
      guestWizardTriggeredRef.current = true;
      let alreadySeen: string | null = null;
      try {
        alreadySeen = window.localStorage.getItem(GUEST_ONBOARDING_SEEN_KEY);
      } catch {
        alreadySeen = null;
      }
      if (!alreadySeen) {
        setWizardInitialStep(1);
        setIsWizardOpen(true);
      }
    }
  }, [authLoading, user, profile, enteredGuestWorkspace, hasShareParam, completeOnboarding, skipOnboarding]);

  // --------------------------------------------------------------------------
  // Carga de Proyecto Compartido Público vía URL (?share=<slug>)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('share')?.trim();
    if (!slug) return;

    let cancelled = false;
    (async () => {
      const res = await fetchSharedProjectBySlug(slug);
      if (cancelled) return;
      if (res.success && res.data) {
        isHydratingCloudRef.current = true;
        setDoc(res.data.circuit_doc);
        setTiaProgram(res.data.tia_program);
        setTiaRuntime(createInitialRuntime(res.data.tia_program));
        setActiveCloudProjectId(null);
        setSharedBanner({ title: res.data.title, slug });
        setActiveView('cad');
        showToast(`Proyecto compartido cargado: "${res.data.title}"`, 'info');
        setTimeout(() => {
          canvasRef.current?.fitToScreen();
          isHydratingCloudRef.current = false;
        }, 250);
      } else if (!res.success) {
        if (res.schemaMissing) setRepoSchemaMissing(true);
        showToast(res.error || 'No se pudo cargar el enlace compartido', 'error');
      } else {
        showToast('El enlace compartido no existe o fue desactivado', 'error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // --------------------------------------------------------------------------
  // Guardado Manual y Autoguardado DB-First en Supabase
  // --------------------------------------------------------------------------
  const performCloudSave = useCallback(
    async (opts?: { forceNew?: boolean; silent?: boolean }) => {
      if (!user) {
        if (!opts?.silent) {
          setAuthModalState({
            open: true,
            mode: 'signup',
            reason: 'Crea una cuenta gratuita o inicia sesión para guardar tus diseños CAD + TIA en Supabase y compartir enlaces.'
          });
        }
        return null;
      }

      setSyncStatus('saving');
      const targetId = opts?.forceNew ? null : activeCloudProjectId;
      const title = docRef.current.titleBlock?.title?.trim() || 'Proyecto Baru Studio';
      const res = await saveProjectToCloud({
        id: targetId,
        userId: user.id,
        title,
        description: docRef.current.titleBlock?.project || 'CADe_SIMU + TIA Portal S7-1200',
        circuitDoc: docRef.current,
        tiaProgram: tiaProgramRef.current
      });

      if (res.success) {
        setActiveCloudProjectId(res.data.id);
        setSharedBanner(null);
        setSyncStatus('saved');
        setRepoSchemaMissing(false);
        setCloudProjects(prev => {
          const exists = prev.some(p => p.id === res.data.id);
          return exists
            ? prev.map(p => (p.id === res.data.id ? res.data : p))
            : [res.data, ...prev];
        });
        if (!opts?.silent) {
          showToast(
            opts?.forceNew
              ? `Copia guardada en la nube: "${res.data.title}"`
              : `Proyecto guardado en Supabase: "${res.data.title}"`,
            'success'
          );
        }
        return res.data;
      } else {
        if (res.schemaMissing) setRepoSchemaMissing(true);
        setSyncStatus(navigator.onLine ? 'error' : 'offline');
        if (!opts?.silent) {
          showToast(res.error || 'No se pudo guardar en Supabase', 'error');
        }
        return null;
      }
    },
    [user, activeCloudProjectId, showToast]
  );

  // Autoguardado con debounce (4s) cuando existe proyecto en nube activo
  useEffect(() => {
    if (!user || !activeCloudProjectId || sharedBanner || isHydratingCloudRef.current) return;
    setSyncStatus('idle');
    const timer = setTimeout(() => {
      performCloudSave({ silent: true });
    }, 4000);
    return () => clearTimeout(timer);
  }, [doc, tiaProgram, user, activeCloudProjectId, sharedBanner, performCloudSave]);

  const handleOpenCloudProject = useCallback(
    (project: CloudProject) => {
      isHydratingCloudRef.current = true;
      setSimulationState(createEmptySimulationState());
      setDoc(project.circuit_doc);
      setTiaProgram(project.tia_program);
      setTiaRuntime(createInitialRuntime(project.tia_program));
      setActiveCloudProjectId(project.id);
      setSharedBanner(null);
      setSelectedComponent(null);
      setSelectedWire(null);
      setSyncStatus('saved');
      setProjectsModalTab(null);
      setActiveView('cad');
      showToast(`Proyecto cargado: "${project.title}"`, 'success');
      setTimeout(() => {
        canvasRef.current?.fitToScreen();
        isHydratingCloudRef.current = false;
      }, 200);
    },
    [showToast]
  );

  const handleDuplicateCloudProject = useCallback(
    async (project: CloudProject) => {
      if (!user) return;
      const res = await duplicateCloudProject(project, user.id);
      if (res.success) {
        setCloudProjects(prev => [res.data, ...prev]);
        showToast(`Duplicado como "${res.data.title}"`, 'success');
      } else {
        showToast(res.error, 'error');
      }
    },
    [user, showToast]
  );

  const handleDeleteCloudProject = useCallback(
    async (project: CloudProject) => {
      if (!user) return;
      const res = await deleteCloudProject(project.id, user.id);
      if (res.success) {
        setCloudProjects(prev => prev.filter(p => p.id !== project.id));
        if (activeCloudProjectId === project.id) {
          setActiveCloudProjectId(null);
          setSyncStatus('idle');
        }
        showToast(`Proyecto "${project.title}" eliminado`, 'info');
      } else {
        showToast(res.error, 'error');
      }
    },
    [user, activeCloudProjectId, showToast]
  );

  const handleToggleShareProject = useCallback(
    async (project: CloudProject, enable: boolean): Promise<CloudProject | null> => {
      if (!user) return null;
      const res = await toggleProjectSharing(project.id, user.id, enable);
      if (res.success) {
        setCloudProjects(prev => prev.map(p => (p.id === res.data.id ? res.data : p)));
        showToast(
          enable ? 'Enlace público activado' : 'Proyecto cambiado a privado',
          'success'
        );
        return res.data;
      } else {
        showToast(res.error, 'error');
        return null;
      }
    },
    [user, showToast]
  );

  const handleCopyShareLink = useCallback(
    (slug: string) => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${slug}`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).then(
          () => showToast('Enlace público copiado al portapapeles', 'success'),
          () => showToast(shareUrl, 'info')
        );
      } else {
        showToast(shareUrl, 'info');
      }
    },
    [showToast]
  );

  const handleCloneSharedProject = useCallback(async () => {
    if (!user) {
      setAuthModalState({
        open: true,
        mode: 'signup',
        reason: 'Inicia sesión o crea tu cuenta para clonar este proyecto compartido en tu espacio de trabajo.'
      });
      return;
    }
    setIsCloningShared(true);
    const saved = await performCloudSave({ forceNew: true });
    setIsCloningShared(false);
    if (saved) {
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      window.history.replaceState({}, '', url.toString());
      setSharedBanner(null);
    }
  }, [user, performCloudSave]);

  const handleDismissSharedBanner = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    window.history.replaceState({}, '', url.toString());
    setSharedBanner(null);
  }, []);

  // --------------------------------------------------------------------------
  // Actualización atómica con historial Undo/Redo
  // --------------------------------------------------------------------------
  const updateDocWithHistory = useCallback(
    (
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
    },
    []
  );

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

  const handleDeleteSelection = useCallback(() => {
    const curDoc = docRef.current;
    if (selectedWire) {
      const remainingWires = curDoc.wires.filter(w => w.id !== selectedWire.id);
      const updatedJunctions = curDoc.junctions.filter(j => {
        let count = 0;
        for (const w of remainingWires) {
          if ((w.fromX === j.x && w.fromY === j.y) || (w.toX === j.x && w.toY === j.y)) count++;
        }
        return count >= 2;
      });
      updateDocWithHistory({ ...curDoc, wires: remainingWires, junctions: updatedJunctions }, true);
      setSelectedWire(null);
      showToast('Cable eliminado', 'info');
      return;
    }

    if (selectedComponent) {
      updateDocWithHistory(
        { ...curDoc, components: curDoc.components.filter(c => c.id !== selectedComponent.id) },
        true
      );
      const tag = selectedComponent.tag;
      setSelectedComponent(null);
      showToast(`Componente ${tag} eliminado`, 'info');
    }
  }, [selectedWire, selectedComponent, updateDocWithHistory, showToast]);

  const handleRotateComponent = useCallback(
    (compId?: string) => {
      const targetId = compId || selectedComponent?.id;
      if (!targetId) return;
      updateDocWithHistory(
        prev => ({
          ...prev,
          components: prev.components.map(c =>
            c.id === targetId ? { ...c, rotation: ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270 } : c
          )
        }),
        true
      );
      setSelectedComponent(prev =>
        prev && prev.id === targetId
          ? { ...prev, rotation: ((prev.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
          : prev
      );
    },
    [selectedComponent, updateDocWithHistory]
  );

  // Atajos globales de teclado (Ctrl+Z, Ctrl+Y, Ctrl+S, R, W, Delete, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWizardOpen) return;
      const tag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const modifier = e.ctrlKey || e.metaKey;
      if (modifier) {
        if ((e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          performCloudSave();
          return;
        }
        if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
          return;
        }
        if (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
          e.preventDefault();
          handleRedo();
          return;
        }
        return;
      }

      if (activeView !== 'cad') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (simStateRef.current.mode === 'stopped' && (selectedComponent || selectedWire)) {
          e.preventDefault();
          handleDeleteSelection();
        }
      } else if ((e.key === 'r' || e.key === 'R') && selectedComponent && simStateRef.current.mode === 'stopped') {
        e.preventDefault();
        handleRotateComponent(selectedComponent.id);
      } else if ((e.key === 'w' || e.key === 'W') && simStateRef.current.mode === 'stopped') {
        e.preventDefault();
        setActiveTool('wire');
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setSelectedComponent(null);
        setSelectedWire(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isWizardOpen,
    activeView,
    selectedComponent,
    selectedWire,
    handleUndo,
    handleRedo,
    handleDeleteSelection,
    handleRotateComponent,
    performCloudSave
  ]);

  // Actualizar instancia del Solver cuando cambia el circuito o fallas
  useEffect(() => {
    solverRef.current = new CircuitSolver(doc.components, doc.wires, doc.junctions, activeFaults);
  }, [doc, activeFaults]);

  // Manejo de fallas y examen con persistencia DB-First en Supabase
  const handleToggleFault = useCallback((faultId: FaultId) => {
    setActiveFaults(prev => {
      const next = new Set(prev);
      if (next.has(faultId)) {
        next.delete(faultId);
      } else {
        next.add(faultId);
        if (faultId === 'short_circuit') {
          setDoc(d => ({
            ...d,
            components: d.components.map(c =>
              c.type === 'breaker_3p' || c.tag === '-Q1' ? { ...c, state: { ...c.state, isOpen: true } } : c
            )
          }));
          soundEffects.playShortCircuitBang();
          setShortCircuitAlert('¡DISPARO MAGNÉTICO INSTANTÁNEO EN -Q1! Cortocircuito franco presente.');
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
        components: d.components.map(c =>
          c.type === 'breaker_3p' || c.tag === '-Q1' ? { ...c, state: { ...c.state, isOpen: true } } : c
        )
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

  const handleSubmitExamAnswer = useCallback(
    (answer: FaultId, notes: string) => {
      const hiddenId = examSession.hiddenFaultId;
      const isCorrect = answer === hiddenId;
      const attempts = examSession.attempts + 1;
      const score = isCorrect ? Math.max(3.0, 5.0 - (attempts - 1) * 0.5) : 2.0;

      if (isCorrect) soundEffects.playSuccessChime();
      else soundEffects.playErrorBuzzer();

      const feedback = isCorrect
        ? `¡Excelente diagnóstico! Has identificado: ${FAULT_CATALOG.find(f => f.id === answer)?.name}.`
        : `Diagnóstico incorrecto para ${FAULT_CATALOG.find(f => f.id === answer)?.shortName}. Verifica tensiones y continuidad con el multímetro.`;

      setExamSession(prev => ({
        ...prev,
        attempts,
        submittedAnswer: answer,
        isPassed: isCorrect,
        score,
        feedback,
        studentNotes: notes
      }));

      // Registrar intento real en Supabase si hay sesión activa
      if (user?.id && hiddenId) {
        recordExamAttempt({
          userId: user.id,
          projectId: activeCloudProjectId,
          hiddenFaultId: hiddenId,
          submittedAnswer: answer,
          isPassed: isCorrect,
          score,
          attempts,
          studentNotes: notes
        }).then(res => {
          if (res.success) {
            setExamAttempts(prev => [res.data, ...prev]);
          } else if (res.schemaMissing) {
            setRepoSchemaMissing(true);
          }
        });
      }
    },
    [examSession.hiddenFaultId, examSession.attempts, user?.id, activeCloudProjectId]
  );

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

  // Paso unificado de co-simulación (Scan TIA Portal + Red Eléctrica/Neumática)
  const executeCoSimulationTick = useCallback((deltaMs: number) => {
    const nextTia = stepTiaScanCycle(
      tiaProgramRef.current,
      plcInputsRef.current,
      tiaRuntimeRef.current,
      deltaMs
    );
    tiaRuntimeRef.current = nextTia;
    plcOutputsRef.current = nextTia.outputs;
    setTiaRuntime(nextTia);

    if (solverRef.current) {
      const nextSim = solverRef.current.step(
        simStateRef.current,
        deltaMs,
        plcOutputsRef.current,
        sampledIn => {
          plcInputsRef.current = sampledIn;
        }
      );
      simStateRef.current = nextSim;
      setSimulationState(nextSim);
    }
  }, []);

  // Bucle de Co-Simulación en tiempo real a 30 Hz
  useEffect(() => {
    if (simulationState.mode !== 'running') return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const deltaMs = Math.min(now - lastTime, 50);
      lastTime = now;
      executeCoSimulationTick(deltaMs);
    }, 33);

    return () => clearInterval(interval);
  }, [simulationState.mode, executeCoSimulationTick]);

  const handleStartSimulation = useCallback(() => {
    plcInputsRef.current = {};
    plcOutputsRef.current = {};
    const prevMode = tiaRuntimeRef.current.gemmaMode || 'AU';
    const prevPe = Boolean(tiaRuntimeRef.current.emergencyStop);
    const freshTia: TiaRuntimeState = {
      ...createInitialRuntime(tiaProgramRef.current),
      gemmaMode: prevMode,
      emergencyStop: prevPe,
      gemmaStateCode: prevPe ? 'D1' : prevMode === 'MAN' ? 'F4' : prevMode === 'ET' ? 'F5' : 'A1'
    };
    tiaRuntimeRef.current = freshTia;
    setTiaRuntime(freshTia);

    const runningSim: SimulationState = {
      ...createEmptySimulationState(),
      mode: 'running'
    };
    simStateRef.current = runningSim;
    setSimulationState(runningSim);
    setActiveTool('select');
  }, []);

  const handleStopSimulation = useCallback(() => {
    plcInputsRef.current = {};
    plcOutputsRef.current = {};
    const freshTia = createInitialRuntime(tiaProgramRef.current);
    tiaRuntimeRef.current = freshTia;
    setTiaRuntime(freshTia);

    const stoppedSim = createEmptySimulationState();
    simStateRef.current = stoppedSim;
    setSimulationState(stoppedSim);
  }, []);

  const handlePauseSimulation = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      mode: prev.mode === 'running' ? 'paused' : 'running'
    }));
  }, []);

  const handleStepSimulation = useCallback(() => {
    executeCoSimulationTick(100);
  }, [executeCoSimulationTick]);

  const handleToggleForceInput = useCallback((addr: string) => {
    const key = addr.toUpperCase();
    setTiaRuntime(prev => {
      const nextForced = { ...prev.forcedInputs, [key]: !prev.forcedInputs[key] };
      const updated: TiaRuntimeState = { ...prev, forcedInputs: nextForced };
      tiaRuntimeRef.current = updated;
      return updated;
    });
  }, []);

  // ---------------- Controles Consola GEMMA (AU / CL / ET / MAN / PE / Rearme) ----------------
  const handleSetGemmaMode = useCallback(
    (mode: GemmaMode) => {
      setTiaRuntime(prev => {
        const updated: TiaRuntimeState = { ...prev, gemmaMode: mode };
        tiaRuntimeRef.current = updated;
        return updated;
      });
      const labels: Record<GemmaMode, string> = {
        AU: 'Automático (F1)',
        CL: 'Ciclo a Ciclo (A2)',
        ET: 'Etapa a Etapa (F5)',
        MAN: 'Manual (F4)'
      };
      showToast(`Modo GEMMA: ${labels[mode]}`, 'info');
    },
    [showToast]
  );

  const handleToggleEmergencyStop = useCallback(() => {
    setTiaRuntime(prev => {
      const nextPe = !prev.emergencyStop;
      const nextOutputs = { ...prev.outputs };
      const nextMemory = { ...prev.memory };
      const nextForced = { ...prev.forcedInputs };
      if (nextPe) {
        for (const k of Object.keys(nextOutputs)) {
          nextOutputs[k] = false;
        }
        nextOutputs['%Q8.4'] = true;
        nextMemory['%M0.0'] = false;
        nextForced['%I0.0'] = false;
        plcOutputsRef.current = nextOutputs;
        plcInputsRef.current = { ...plcInputsRef.current, '%I0.0': false, '%I0.1': true, '%I8.3': false };
        soundEffects.playErrorBuzzer();
      } else {
        nextOutputs['%Q8.4'] = false;
        plcOutputsRef.current = nextOutputs;
        plcInputsRef.current = { ...plcInputsRef.current, '%I0.1': false, '%I8.3': true };
        soundEffects.playTripClick();
      }
      const updated: TiaRuntimeState = {
        ...prev,
        emergencyStop: nextPe,
        outputs: nextOutputs,
        memory: nextMemory,
        forcedInputs: nextForced,
        gemmaStateCode: nextPe ? 'D1' : 'A1'
      };
      tiaRuntimeRef.current = updated;
      return updated;
    });
  }, []);

  const handleTriggerRearm = useCallback(() => {
    if (tiaRuntimeRef.current.emergencyStop) {
      showToast('Libera primero el Paro de Emergencia (PE) antes de pulsar Rearme (A6)', 'error');
      soundEffects.playErrorBuzzer();
      return;
    }
    const initSteps = tiaProgramRef.current.grafcetSteps.filter(s => s.isInitial).map(s => s.id);
    setTiaRuntime(prev => {
      const clearedOutputs: Record<string, boolean> = {};
      for (const k of Object.keys(prev.outputs)) clearedOutputs[k] = false;
      const clearedMem: Record<string, boolean> = {};
      for (const k of Object.keys(prev.memory)) clearedMem[k] = false;
      plcOutputsRef.current = clearedOutputs;
      const updated: TiaRuntimeState = {
        ...prev,
        outputs: clearedOutputs,
        memory: clearedMem,
        timers: {},
        activeSteps: initSteps.length > 0 ? initSteps : [0],
        rearmPulse: true,
        gemmaStateCode: 'A6'
      };
      tiaRuntimeRef.current = updated;
      return updated;
    });
    soundEffects.playSuccessChime();
    showToast('Rearme GEMMA (A6 / RecFa) ejecutado — actuadores en posición inicial', 'success');
  }, [showToast]);

  const handleTriggerCyclePulse = useCallback(() => {
    if (tiaRuntimeRef.current.emergencyStop) {
      showToast('Paro de Emergencia (D1) activo — libera PE y rearma primero', 'error');
      return;
    }
    if (simStateRef.current.mode !== 'running') {
      handleStartSimulation();
    }
    setTiaRuntime(prev => {
      const updated: TiaRuntimeState = { ...prev, cyclePulse: true };
      tiaRuntimeRef.current = updated;
      return updated;
    });
    soundEffects.playTripClick();
  }, [handleStartSimulation, showToast]);

  const handleTriggerStepPulse = useCallback(() => {
    if (tiaRuntimeRef.current.emergencyStop) {
      showToast('Paro de Emergencia (D1) activo — libera PE y rearma primero', 'error');
      return;
    }
    if (simStateRef.current.mode !== 'running') {
      handleStartSimulation();
    }
    setTiaRuntime(prev => {
      const updated: TiaRuntimeState = { ...prev, stepPulse: true };
      tiaRuntimeRef.current = updated;
      return updated;
    });
    soundEffects.playTripClick();
  }, [handleStartSimulation, showToast]);

  const handleStopPlant = useCallback(() => {
    const initSteps = tiaProgramRef.current.grafcetSteps.filter(s => s.isInitial).map(s => s.id);
    setTiaRuntime(prev => {
      const clearedOutputs: Record<string, boolean> = {};
      for (const k of Object.keys(prev.outputs)) {
        clearedOutputs[k] = k === '%Q8.4' ? prev.emergencyStop : false;
      }
      const clearedMem: Record<string, boolean> = { ...prev.memory, '%M0.0': false };
      const clearedForced: Record<string, boolean> = { ...prev.forcedInputs, '%I0.0': false };
      plcOutputsRef.current = clearedOutputs;
      plcInputsRef.current = { ...plcInputsRef.current, '%I0.0': false, '%I0.1': true };
      const updated: TiaRuntimeState = {
        ...prev,
        outputs: clearedOutputs,
        memory: clearedMem,
        forcedInputs: clearedForced,
        activeSteps: initSteps.length > 0 ? initSteps : [0],
        gemmaStateCode: prev.emergencyStop ? 'D1' : 'A1'
      };
      tiaRuntimeRef.current = updated;
      return updated;
    });
    setTimeout(() => {
      plcInputsRef.current = { ...plcInputsRef.current, '%I0.1': false };
    }, 350);
  }, []);

  const handleToggleBreaker = useCallback(
    (compId: string) => {
      if (activeFaults.has('short_circuit')) {
        soundEffects.playShortCircuitBang();
        setShortCircuitAlert('¡DISPARO MAGNÉTICO INSTANTÁNEO EN -Q1! Cortocircuito franco presente.');
        setTimeout(() => setShortCircuitAlert(null), 4500);
        setDoc(prev => ({
          ...prev,
          components: prev.components.map(c =>
            c.id === compId || c.type === 'breaker_3p' ? { ...c, state: { ...c.state, isOpen: true } } : c
          )
        }));
        return;
      }
      soundEffects.playTripClick();
      setDoc(prev => ({
        ...prev,
        components: prev.components.map(c =>
          c.id === compId ? { ...c, state: { ...c.state, isOpen: !(c.state?.isOpen ?? false) } } : c
        )
      }));
    },
    [activeFaults]
  );

  const handlePressButton = useCallback((compId: string, isPressed: boolean) => {
    soundEffects.playTripClick();
    setDoc(prev => {
      const nextComponents = prev.components.map(c =>
        c.id === compId ? { ...c, state: { ...c.state, isActuated: isPressed } } : c
      );
      if (solverRef.current) {
        solverRef.current.setComponents(nextComponents);
      }
      return { ...prev, components: nextComponents };
    });
  }, []);

  const handleAddComponentFromDrawer = useCallback(
    (compType: string) => {
      if (simStateRef.current.mode === 'running') {
        showToast('Detén la simulación para agregar o mover componentes', 'info');
        return;
      }
      const def = COMPONENT_CATALOG.find(c => c.type === compType);
      if (!def) return;

      const offset = (docRef.current.components.length % 5) * 2;
      const newComp: PlacedComponent = {
        id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: compType,
        tag: `${def.defaultTag}${docRef.current.components.length + 1}`,
        x: Math.max(2, Math.min(48, (coords.x || 12) + offset)),
        y: Math.max(2, Math.min(34, coords.y || 10)),
        rotation: 0,
        state: { isOpen: false, isActuated: false }
      };

      updateDocWithHistory(prev => ({ ...prev, components: [...prev.components, newComp] }), true);
      setSelectedComponent(newComp);
      setSelectedWire(null);
      setActiveTool('select');
    },
    [coords, showToast, updateDocWithHistory]
  );

  const handleLoadExample = useCallback(
    (exampleId: string) => {
      handleStopSimulation();
      const preset = getExamplePreset(exampleId);

      setActiveCloudProjectId(null);
      setSharedBanner(null);
      setSyncStatus('idle');
      setProbedTarget(null);
      updateDocWithHistory(preset.circuit, true);
      setTiaProgram(preset.tiaProgram);
      setTiaRuntime(createInitialRuntime(preset.tiaProgram));
      setSelectedComponent(null);
      setSelectedWire(null);
      setActiveView('cad');
      showToast(`Cargado: ${preset.label} (CAD + LAD + SCL + GRAFCET)`, 'info');
      setTimeout(() => canvasRef.current?.fitToScreen(), 150);
    },
    [handleStopSimulation, showToast, updateDocWithHistory]
  );

  const handleNewDocument = useCallback(() => {
    handleStopSimulation();
    setActiveCloudProjectId(null);
    setSharedBanner(null);
    setSyncStatus('idle');
    updateDocWithHistory(
      {
        version: '2.0.0',
        gridSize: 20,
        titleBlock: {
          title: 'Nuevo Proyecto CAD + TIA',
          project: 'Automatización Industrial',
          author: profile?.full_name || 'Simón Barrera Ruíz',
          date: new Date().toISOString().split('T')[0],
          sheet: '1/1',
          scale: '1:1',
          revision: '1.0',
          company: 'Baru Studio'
        },
        components: [],
        wires: [],
        junctions: []
      },
      true
    );
    const emptyProg = createEmptyTiaProgram();
    setTiaProgram(emptyProg);
    setTiaRuntime(createInitialRuntime(emptyProg));
    setProbedTarget(null);
    setSelectedComponent(null);
    setSelectedWire(null);
    showToast('Nuevo proyecto en blanco (CAD + LAD + SCL + GRAFCET)', 'info');
  }, [handleStopSimulation, profile?.full_name, updateDocWithHistory, showToast]);

  const handleTwinPressButton = useCallback(
    (btnKey: string, isPressed: boolean) => {
      // Si el usuario pulsa Marcha en Planta 2D con la simulación detenida, arrancar automáticamente
      if (btnKey === 'btn_start' && isPressed && simStateRef.current.mode !== 'running') {
        handleStartSimulation();
      }

      const targets = docRef.current.components.filter(c => {
        if (btnKey === 'btn_start') {
          return (
            c.id === 'btn_start' ||
            c.id === 'btn_start_cw' ||
            c.tag === '-S1' ||
            c.plcAddress === '%I0.0' ||
            (c.type === 'button_no' && c.tag.includes('1'))
          );
        }
        if (btnKey === 'btn_stop') {
          return (
            c.id === 'btn_stop' ||
            c.id === 'btn_es' ||
            c.tag === '-S0' ||
            c.plcAddress === '%I0.1' ||
            c.type === 'button_nc' ||
            c.type === 'emergency_stop'
          );
        }
        return false;
      });

      if (targets.length > 0) {
        targets.forEach(t => handlePressButton(t.id, isPressed));
      } else {
        const addr = btnKey === 'btn_start' ? '%I0.0' : '%I0.1';
        plcInputsRef.current = { ...plcInputsRef.current, [addr]: isPressed };
      }
    },
    [handlePressButton, handleStartSimulation]
  );

  // Handlers del Wizard de 5 Pasos
  const handleReplayTutorial = useCallback(async () => {
    setWizardInitialStep(1);
    setIsWizardOpen(true);
    if (user) {
      await resetOnboarding();
    }
  }, [user, resetOnboarding]);

  const handleSkipWizard = useCallback(async () => {
    setIsWizardOpen(false);
    try {
      window.localStorage.setItem(GUEST_ONBOARDING_SEEN_KEY, 'skipped');
      window.sessionStorage.setItem(SESSION_ONBOARDING_DONE_KEY, 'skipped');
    } catch {
      // Ignore storage errors
    }
    if (user) {
      await skipOnboarding();
    }
    showToast('Tutorial omitido — puedes repetirlo desde Herramientas o tu perfil', 'info');
  }, [user, skipOnboarding, showToast]);

  const handleCompleteWizard = useCallback(async () => {
    setIsWizardOpen(false);
    try {
      window.localStorage.setItem(GUEST_ONBOARDING_SEEN_KEY, 'completed');
      window.sessionStorage.setItem(SESSION_ONBOARDING_DONE_KEY, 'completed');
    } catch {
      // Ignore storage errors
    }
    if (user) {
      await completeOnboarding();
    }
    showToast('¡Tutorial completado! Ya dominas Baru Studio CAD + TIA', 'success');
  }, [user, completeOnboarding, showToast]);

  const handleSignOut = useCallback(async () => {
    const res = await signOut();
    if (res.success) {
      setEnteredGuestWorkspace(false);
      showToast('Sesión cerrada correctamente', 'info');
    } else if (res.error) {
      showToast(res.error, 'error');
    }
  }, [signOut, showToast]);

  const handleOpenImportModal = useCallback(() => {
    if (!user) {
      setAuthModalState({
        open: true,
        mode: 'signup',
        reason: 'Modo Invitado: inicia sesión o crea una cuenta gratuita para importar archivos .cad, .xml, .scl o .json.'
      });
      showToast('Inicia sesión para importar proyectos', 'info');
      return;
    }
    setExportModalTab('import');
  }, [user, showToast]);

  const handleOpenExportModal = useCallback(() => {
    if (!user) {
      setAuthModalState({
        open: true,
        mode: 'signup',
        reason: 'Modo Invitado: inicia sesión o crea una cuenta gratuita para exportar archivos CADe_SIMU (.cad) y paquetes TIA Portal (.zip).'
      });
      showToast('Inicia sesión para exportar proyectos', 'info');
      return;
    }
    setExportModalTab('export');
  }, [user, showToast]);

  useEffect(() => {
    if (activeView === 'cad' && (user || enteredGuestWorkspace || hasShareParam)) {
      const t = setTimeout(() => canvasRef.current?.fitToScreen(), 80);
      return () => clearTimeout(t);
    }
  }, [activeView, user, enteredGuestWorkspace, hasShareParam]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const isSimRunning = simulationState.mode === 'running' || simulationState.mode === 'paused';
  const combinedSchemaMissing = authSchemaMissing || repoSchemaMissing;

  const handleOpenMultimeter = useCallback(() => {
    setIsMeterOpen(true);
    setIsProbeActive(true);
    setActiveView('cad');
    setIsDrawerOpen(false);
  }, []);

  const handleCloseMultimeter = useCallback(() => {
    setIsMeterOpen(false);
    setIsProbeActive(false);
    setProbedTarget(null);
  }, []);

  // Medición en vivo del punto tocado con la sonda del multímetro
  const activeMeasurement: ElectricalMeasurement | null = useMemo(() => {
    if (!probedTarget) return null;

    if (probedTarget.kind === 'wire') {
      const m = simulationState.wireMetrics?.get(probedTarget.id);
      if (m) return m;
      const w = doc.wires.find(item => item.id === probedTarget.id);
      return {
        label: w ? `Cable (${w.wireType.toUpperCase()})` : 'Conductor',
        targetType: 'wire',
        targetId: probedTarget.id,
        potential: 'Sin tensión',
        voltageV: 0,
        voltageMode: w?.wireType === 'dc_pos' || w?.wireType === 'dc_neg' ? 'DC' : 'AC',
        currentA: 0,
        powerW: 0,
        frequencyHz: 0,
        isEnergized: false,
        statusNote: 'Simulación detenida — pulsa Iniciar simulación para medir en vivo',
        gridX: probedTarget.x,
        gridY: probedTarget.y
      };
    }

    if (probedTarget.kind === 'pin') {
      const m = simulationState.pinMetrics?.get(probedTarget.id);
      if (m) return m;
      const [compId, pinId] = probedTarget.id.split(':');
      const comp = doc.components.find(c => c.id === compId);
      return {
        label: comp ? `${comp.tag} : Borne ${pinId}` : `Borne ${pinId}`,
        targetType: 'pin',
        targetId: probedTarget.id,
        potential: 'Sin tensión',
        voltageV: 0,
        voltageMode: 'AC',
        currentA: 0,
        powerW: 0,
        frequencyHz: 0,
        isEnergized: false,
        statusNote: 'Simulación detenida — pulsa Iniciar simulación para medir en vivo',
        gridX: probedTarget.x,
        gridY: probedTarget.y
      };
    }

    const m = simulationState.componentMetrics?.get(probedTarget.id);
    if (m) return m;
    const comp = doc.components.find(c => c.id === probedTarget.id);
    const def = comp ? COMPONENT_CATALOG.find(d => d.type === comp.type) : null;
    return {
      label: comp ? `${comp.tag} (${def?.name || comp.type})` : 'Componente',
      targetType: 'component',
      targetId: probedTarget.id,
      potential: 'Sin tensión',
      voltageV: 0,
      voltageMode: 'AC',
      currentA: 0,
      powerW: 0,
      frequencyHz: 0,
      isEnergized: false,
      statusNote: 'Simulación detenida — pulsa Iniciar simulación para medir en vivo',
      gridX: probedTarget.x,
      gridY: probedTarget.y
    };
  }, [probedTarget, simulationState.wireMetrics, simulationState.pinMetrics, simulationState.componentMetrics, doc.wires, doc.components]);

  if (authLoading && !user && !enteredGuestWorkspace && !hasShareParam) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#030712] text-slate-200 select-none">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Cargando Baru Studio...
        </span>
      </div>
    );
  }

  if (!authLoading && !user && !enteredGuestWorkspace && !hasShareParam) {
    return (
      <>
        <LandingPage
          onEnterGuest={() => setEnteredGuestWorkspace(true)}
          onOpenAuth={mode => setAuthModalState({ open: true, mode, reason: null })}
        />
        <AuthModal
          isOpen={authModalState.open}
          initialMode={authModalState.mode}
          reasonMessage={authModalState.reason}
          onClose={() => setAuthModalState(prev => ({ ...prev, open: false }))}
          onAuthSuccess={isNew => {
            showToast(
              isNew ? '¡Bienvenido! Tu cuenta fue creada con éxito' : 'Sesión iniciada correctamente',
              'success'
            );
          }}
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-100 text-slate-800 font-sans">
      {/* Cabecera Minimalista estilo Tinkercad */}
      <TinkerHeader
        projectTitle={doc.titleBlock?.title || 'Sin título'}
        onChangeTitle={newTitle =>
          setDoc(prev => ({ ...prev, titleBlock: { ...prev.titleBlock, title: newTitle } }))
        }
        activeView={activeView}
        onChangeView={setActiveView}
        simulationMode={simulationState.mode}
        onStartSimulation={handleStartSimulation}
        onStopSimulation={handleStopSimulation}
        onPauseSimulation={handlePauseSimulation}
        onStepSimulation={handleStepSimulation}
        onNewProject={handleNewDocument}
        onLoadExample={handleLoadExample}
        onOpenImportModal={handleOpenImportModal}
        onOpenExportModal={handleOpenExportModal}
        onOpenMultimeter={handleOpenMultimeter}
        onOpenTiming={() => setIsTimingOpen(true)}
        onOpenFaults={() => setIsFaultsOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        hasActiveFault={activeFaults.size > 0}
        isExamActive={examSession.isActive}
        isAuthenticated={!!user}
        userDisplayName={profile?.full_name || user?.email?.split('@')[0] || ''}
        userEmail={user?.email || ''}
        syncStatus={syncStatus}
        hasActiveCloudProject={!!activeCloudProjectId}
        onSaveToCloud={() => performCloudSave()}
        onOpenProjects={(tab = 'projects') => setProjectsModalTab(tab)}
        onOpenAuth={(mode = 'login') => setAuthModalState({ open: true, mode, reason: null })}
        onSignOut={handleSignOut}
        onReplayTutorial={handleReplayTutorial}
        onReturnToLanding={() => setEnteredGuestWorkspace(false)}
      />

      {/* Banner de Proyecto Compartido Público (?share=...) */}
      {sharedBanner && (
        <SharedProjectBanner
          projectTitle={sharedBanner.title}
          shareSlug={sharedBanner.slug}
          isAuthenticated={!!user}
          isCloning={isCloningShared}
          onCloneToMyAccount={handleCloneSharedProject}
          onDismiss={handleDismissSharedBanner}
        />
      )}

      {/* Área Principal de Trabajo según Pestaña */}
      <div className="relative flex-1 flex overflow-hidden">
        {activeView === 'cad' && (
          <div data-tour="cad-workspace" className="relative flex-1 flex overflow-hidden">
            <div className="relative flex-1 overflow-hidden">
              <SchematicCanvas
                ref={canvasRef}
                document={doc}
                simulationState={simulationState}
                activeWireType={selectedWireType}
                activeTool={activeTool}
                selectedWireId={selectedWire?.id || null}
                onSetTool={setActiveTool}
                onUpdateDocument={(newDoc, saveHistory = true, prevSnapshot) => {
                  updateDocWithHistory(newDoc, saveHistory, prevSnapshot);
                }}
                onComponentSelect={c => {
                  setSelectedComponent(c);
                  if (c) setSelectedWire(null);
                }}
                onWireSelect={w => {
                  setSelectedWire(w);
                  if (w) setSelectedComponent(null);
                }}
                onComponentEdit={setEditingComponent}
                onCoordinatesChange={(x, y) => setCoords({ x, y })}
                onToggleBreaker={handleToggleBreaker}
                onPressButton={handlePressButton}
                isProbeMode={isMeterOpen && isProbeActive}
                probedMarker={
                  isMeterOpen && probedTarget
                    ? { x: probedTarget.x, y: probedTarget.y, label: activeMeasurement?.label }
                    : null
                }
                onProbeTarget={target => {
                  setProbedTarget(target);
                  soundEffects.playContinuityBeep(65);
                }}
              />

              {/* Píldora flotante izquierda de acciones CAD */}
              <TinkerFloatingBar
                activeTool={activeTool}
                selectedWireType={selectedWireType}
                canUndo={pastDocs.length > 0}
                canRedo={futureDocs.length > 0}
                hasSelection={!!selectedComponent || !!selectedWire}
                isDrawerOpen={isDrawerOpen}
                isSimRunning={isSimRunning}
                onSetTool={setActiveTool}
                onSelectWireType={setSelectedWireType}
                onRotateSelected={() => handleRotateComponent()}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onDelete={handleDeleteSelection}
                onFitScreen={() => canvasRef.current?.fitToScreen()}
                onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
              />

              {/* Inspector Contextual (solo visible cuando hay selección) */}
              <TinkerInspector
                selectedComponent={selectedComponent}
                selectedWire={selectedWire}
                isSimRunning={isSimRunning}
                onUpdateComponent={updated => {
                  setSelectedComponent(updated);
                  updateDocWithHistory(
                    prev => ({
                      ...prev,
                      components: prev.components.map(c => (c.id === updated.id ? updated : c))
                    }),
                    true
                  );
                }}
                onRotateComponent={handleRotateComponent}
                onDeleteSelection={handleDeleteSelection}
                onClearSelection={() => {
                  setSelectedComponent(null);
                  setSelectedWire(null);
                }}
                onOpenDetailedModal={setEditingComponent}
              />
            </div>

            {/* Cajón derecho buscable de componentes */}
            <TinkerComponentDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              onAddComponent={handleAddComponentFromDrawer}
            />
          </div>
        )}

        {activeView === 'tia' && (
          <div data-tour="tia-workspace" className="flex-1 flex overflow-hidden">
            <TiaWorkspaceView
              program={tiaProgram}
              runtime={tiaRuntime}
              simulationMode={simulationState.mode}
              onChangeProgram={next => setTiaProgram(next)}
              onToggleForceInput={handleToggleForceInput}
              onSetGemmaMode={handleSetGemmaMode}
              onToggleEmergencyStop={handleToggleEmergencyStop}
              onTriggerRearm={handleTriggerRearm}
              onTriggerCyclePulse={handleTriggerCyclePulse}
              onTriggerStepPulse={handleTriggerStepPulse}
              onShowToast={showToast}
            />
          </div>
        )}

        {activeView === 'plant' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex items-center justify-center">
            <DigitalTwinPlant
              embeddedMode
              isOpen
              simulationState={simulationState}
              document={doc}
              onPressButton={handleTwinPressButton}
              onLoadExample={handleLoadExample}
              gemmaMode={tiaRuntime.gemmaMode}
              emergencyStop={tiaRuntime.emergencyStop}
              gemmaStateCode={tiaRuntime.gemmaStateCode}
              onSetGemmaMode={handleSetGemmaMode}
              onToggleEmergencyStop={handleToggleEmergencyStop}
              onTriggerRearm={handleTriggerRearm}
              onTriggerCyclePulse={handleTriggerCyclePulse}
              onTriggerStepPulse={handleTriggerStepPulse}
              onStopPlant={handleStopPlant}
              onClose={() => setActiveView('cad')}
            />
          </div>
        )}

        {/* Alertas flotantes de Avería o Cortocircuito */}
        {activeFaults.size > 0 && !examSession.isActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-rose-600/95 backdrop-blur-xs text-white text-xs font-bold rounded-full shadow-xl border border-rose-400 select-none">
            <AlertOctagon className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            <span>
              {activeFaults.size === 1
                ? `Avería Activa: ${Array.from(activeFaults).map(f => FAULT_CATALOG.find(cat => cat.id === f)?.shortName || f).join(', ')}`
                : `${activeFaults.size} Averías Activas`}
            </span>
            <button
              onClick={() => setIsFaultsOpen(true)}
              className="px-2 py-0.5 bg-white text-rose-700 text-[11px] font-extrabold rounded-md cursor-pointer"
            >
              Inspeccionar
            </button>
            <button
              onClick={handleResetFaults}
              className="px-2 py-0.5 bg-rose-800 text-rose-100 text-[11px] rounded-md cursor-pointer"
            >
              Restablecer
            </button>
          </div>
        )}

        {shortCircuitAlert && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 bg-red-700 text-white text-xs font-black rounded-lg shadow-2xl border-2 border-amber-400 animate-bounce select-none">
            <AlertOctagon className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{shortCircuitAlert}</span>
          </div>
        )}

        {/* Herramientas Avanzadas Flotantes */}
        <TimingDiagram
          simulationState={simulationState}
          document={doc}
          isOpen={isTimingOpen}
          onClose={() => setIsTimingOpen(false)}
        />

        <VirtualMultimeter
          simulationState={simulationState}
          isOpen={isMeterOpen}
          onClose={handleCloseMultimeter}
          activeFaults={activeFaults}
          measurement={activeMeasurement}
          isProbeActive={isProbeActive}
          onToggleProbe={() => setIsProbeActive(prev => !prev)}
          onStartSimulation={handleStartSimulation}
        />
      </div>

      {/* Pie de página */}
      <footer className="shrink-0 bg-white/95 border-t border-slate-200/80 px-4 py-1 text-center text-[11px] text-slate-500 select-none z-30">
        Desarrollado por Scibaru AI.
      </footer>

      {/* Modales Cloud & Auth */}
      <AuthModal
        isOpen={authModalState.open}
        initialMode={authModalState.mode}
        reasonMessage={authModalState.reason}
        onClose={() => setAuthModalState(prev => ({ ...prev, open: false }))}
        onAuthSuccess={isNew => {
          showToast(
            isNew ? '¡Bienvenido! Tu cuenta fue creada con éxito' : 'Sesión iniciada correctamente',
            'success'
          );
        }}
      />

      <ProjectsModal
        isOpen={!!projectsModalTab}
        initialTab={projectsModalTab || 'projects'}
        activeProjectId={activeCloudProjectId}
        projects={cloudProjects}
        examAttempts={examAttempts}
        isLoading={isLoadingCloud}
        schemaMissing={combinedSchemaMissing}
        isAuthenticated={!!user}
        onClose={() => setProjectsModalTab(null)}
        onOpenAuth={(mode = 'login') => {
          setProjectsModalTab(null);
          setAuthModalState({ open: true, mode, reason: null });
        }}
        onRefresh={() => {
          if (user?.id) refreshCloudData(user.id);
        }}
        onOpenProject={handleOpenCloudProject}
        onSaveAsNew={() => performCloudSave({ forceNew: true })}
        onDuplicateProject={handleDuplicateCloudProject}
        onDeleteProject={handleDeleteCloudProject}
        onToggleShare={handleToggleShareProject}
        onCopyShareLink={handleCopyShareLink}
      />

      {/* Wizard Tutorial Interactivo de 5 Pasos (Onboarding) */}
      <OnboardingWizard
        isOpen={isWizardOpen}
        initialStep={wizardInitialStep}
        onChangeView={setActiveView}
        onSetDrawerOpen={setIsDrawerOpen}
        onStepChange={step => {
          if (user) {
            setOnboardingStep(step);
          }
        }}
        onSkip={handleSkipWizard}
        onComplete={handleCompleteWizard}
      />

      {/* Modales de Edición, Exportación y Diagnóstico */}
      {editingComponent && (
        <ComponentEditModal
          component={editingComponent}
          isOpen={!!editingComponent}
          onClose={() => setEditingComponent(null)}
          onSave={updated => {
            setSelectedComponent(updated);
            updateDocWithHistory(
              prev => ({
                ...prev,
                components: prev.components.map(c => (c.id === updated.id ? updated : c))
              }),
              true
            );
          }}
        />
      )}

      {exportModalTab && (
        <UnifiedExportModal
          isOpen={!!exportModalTab}
          initialTab={exportModalTab}
          document={doc}
          tiaProgram={tiaProgram}
          onClose={() => setExportModalTab(null)}
          onImportCircuit={(newDoc, extractedTia) => {
            handleStopSimulation();
            setActiveCloudProjectId(null);
            setSharedBanner(null);
            setProbedTarget(null);
            updateDocWithHistory(newDoc, true);
            if (extractedTia) {
              setTiaProgram(extractedTia);
              setTiaRuntime(createInitialRuntime(extractedTia));
            }
            setSelectedComponent(null);
            setSelectedWire(null);
            setActiveView('cad');
            setTimeout(() => canvasRef.current?.fitToScreen(), 200);
          }}
          onImportTiaProgram={newProg => {
            handleStopSimulation();
            setTiaProgram(newProg);
            setTiaRuntime(createInitialRuntime(newProg));
            setActiveView('tia');
          }}
          onShowToast={showToast}
        />
      )}

      {isAboutOpen && <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />}

      <LabReportModal isOpen={isReportOpen} document={doc} onClose={() => setIsReportOpen(false)} />

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
        onOpenMultimeter={handleOpenMultimeter}
        simulationState={simulationState}
      />

      {/* Notificaciones Toast */}
      {toast && (
        <div
          className={`fixed bottom-9 right-6 z-[80] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold select-none animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-700 text-white border border-rose-500'
              : toast.type === 'info'
                ? 'bg-sky-700 text-white border border-sky-500'
                : 'bg-slate-900/95 text-emerald-400 border border-emerald-500/60 backdrop-blur-md'
          }`}
        >
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
