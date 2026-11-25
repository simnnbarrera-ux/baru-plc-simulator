import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  CircuitBoard,
  Cpu,
  Play,
  Cloud,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2
} from 'lucide-react';

export type OnboardingView = 'cad' | 'tia' | 'plant';

interface Props {
  isOpen: boolean;
  initialStep?: number; // 1 to 5
  onChangeView: (view: OnboardingView) => void;
  onSetDrawerOpen?: (open: boolean) => void;
  onStepChange?: (step: number) => void;
  onSkip: () => void;
  onComplete: () => void;
}

type AccentTone = 'sky' | 'emerald';
type CardPlacement = 'bottom' | 'top' | 'right' | 'left' | 'center';

interface TourStepConfig {
  id: number;
  target: string;
  view: OnboardingView;
  openDrawer?: boolean;
  accent: AccentTone;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  tips: string[];
  icon: React.ComponentType<{ className?: string }>;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

interface CardPosition {
  top: number;
  left: number;
  placement: CardPlacement;
  arrowOffset: number | null;
}

const TOTAL_STEPS = 5;
const VIEWPORT_MARGIN = 16;
const CARD_GAP = 16;
const SPOTLIGHT_PADDING = 6;

const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 1,
    target: '[data-tour="header-views"]',
    view: 'cad',
    openDrawer: false,
    accent: 'sky',
    badge: 'Espacio unificado',
    title: 'Bienvenido a Baru Studio',
    subtitle: 'CADe_SIMU + TIA Portal S7-1200 en un solo espacio',
    description:
      'Explora las tres vistas principales desde la barra superior: Esquema CAD para potencia, mando y neumática; Código TIA para programar en LAD, SCL y GRAFCET; y Planta 2D para supervisar tu gemelo digital en vivo.',
    tips: [
      'Esquema CAD: diseña circuitos de potencia trifásica, mando eléctrico y electroneumática.',
      'Código TIA (LAD / SCL): programa el PLC S7-1200 en Ladder, Texto Estructurado y GRAFCET.',
      'Planta 2D: valida el comportamiento real de motores, sensores y cilindros en vivo.'
    ],
    icon: Sparkles
  },
  {
    id: 2,
    target: '[data-tour="cad-workspace"]',
    view: 'cad',
    openDrawer: true,
    accent: 'sky',
    badge: 'Esquema CAD + Quick-Link',
    title: 'Arma tu esquema y usa Quick-Link',
    subtitle: 'Componentes buscables, cableado a colores y vínculo %I / %Q',
    description:
      'Agrega o arrastra símbolos desde el cajón derecho de componentes, cablea con colores normalizados IEC desde la barra flotante y enlaza cualquier pulsador, bobina o sensor al PLC con Quick-Link (%I0.0, %Q0.0) en el inspector contextual.',
    tips: [
      'Cajón derecho: busca e inserta pulsadores, contactores, térmicos, motores y válvulas.',
      'Cableado IEC: alterna colores para L1, L2, L3, Neutro, PE y alimentación +24V / 0V.',
      'Quick-Link PLC: selecciona cualquier elemento y vincúlalo directo a %I0.0 o %Q0.0.'
    ],
    icon: CircuitBoard
  },
  {
    id: 3,
    target: '[data-tour="tia-workspace"]',
    view: 'tia',
    openDrawer: false,
    accent: 'emerald',
    badge: 'Siemens S7-1200',
    title: 'Programa el S7-1200 con Gafas Online',
    subtitle: 'Ladder (LAD), Texto Estructurado (SCL) y Tabla de Tags',
    description:
      'Interactúa con la tarjeta CPU 1214C en vivo mediante interruptores forzables %I y LEDs %Q, organiza la Tabla de Tags del PLC, activa las «Gafas Online» para seguir el flujo de energía en Ladder y usa el compilador SCL o «Transpilar LAD → SCL» en 1 clic.',
    tips: [
      'CPU 1214C interactiva: fuerza entradas %I con un clic y supervisa los LEDs de salidas %Q.',
      'Gafas Online y Tags: observa el flujo de energía en tiempo real sobre cada segmento LAD.',
      'Compilador SCL: programa en Texto Estructurado o convierte tu red con «Transpilar LAD → SCL».'
    ],
    icon: Cpu
  },
  {
    id: 4,
    target: '[data-tour="sim-controls"]',
    view: 'plant',
    openDrawer: false,
    accent: 'emerald',
    badge: 'Co-simulación en vivo',
    title: 'Simula en vivo y controla la Planta 2D',
    subtitle: 'Co-simulación eléctrica, PLC y electroneumática A+ / A-',
    description:
      'Pulsa el botón verde «Iniciar simulación» para ejecutar en paralelo el circuito eléctrico y el ciclo de escaneo del S7-1200. Al accionar Marcha (-S1) o Paro (-S0), motores, cintas, tanques y cilindros neumáticos A+ / A- reaccionan al instante.',
    tips: [
      'Ciclo sincronizado: esquema CAD, CPU S7-1200 y Planta 2D corren en tiempo real.',
      'Mandos de operación: presiona -S1 (Marcha) o -S0 (Paro) para probar ciclos A+ / A-.',
      'Control de depuración: pausa o avanza paso a paso para verificar enclavamientos y sensores.'
    ],
    icon: Play
  },
  {
    id: 5,
    target: '[data-tour="cloud-export"]',
    view: 'cad',
    openDrawer: false,
    accent: 'sky',
    badge: 'Nube y exportación',
    title: 'Guarda en la nube y exporta a CADe / TIA',
    subtitle: 'Proyectos sincronizados, enlaces compartibles y descargas nativas',
    description:
      'Guarda tus proyectos en la nube con Supabase desde Guardar y Mis Proyectos, comparte enlaces públicos de tus circuitos y descarga archivos nativos .cad (CADe_SIMU V4.2) así como paquetes .zip, Openness .xml y .scl para Siemens TIA Portal V16–V21.',
    tips: [
      'Nube Supabase: respalda tus diseños en Mis Proyectos y compártelos mediante enlace público.',
      'Exportar a CADe_SIMU: descarga planos en formato nativo .cad listos para V4.2.',
      'Exportar a TIA Portal: genera paquetes .zip, Openness .xml y fuentes .scl para V16–V21.'
    ],
    icon: Cloud
  }
];

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function clampStep(step: number | undefined): number {
  if (typeof step !== 'number' || Number.isNaN(step)) return 1;
  return Math.min(TOTAL_STEPS, Math.max(1, Math.round(step)));
}

function measureSpotlightRect(selector: string): SpotlightRect | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Treat hidden, collapsed, or completely off-screen anchors as missing
  if (
    rect.width < 4 ||
    rect.height < 4 ||
    rect.bottom <= 0 ||
    rect.top >= vh ||
    rect.right <= 0 ||
    rect.left >= vw
  ) {
    return null;
  }

  const edgeInset = 4;
  const top = clampNumber(rect.top - SPOTLIGHT_PADDING, edgeInset, vh - edgeInset);
  const left = clampNumber(rect.left - SPOTLIGHT_PADDING, edgeInset, vw - edgeInset);
  const bottom = clampNumber(rect.bottom + SPOTLIGHT_PADDING, edgeInset, vh - edgeInset);
  const right = clampNumber(rect.right + SPOTLIGHT_PADDING, edgeInset, vw - edgeInset);

  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  if (width < 4 || height < 4) return null;

  return { top, left, width, height, bottom, right };
}

function computeCardPosition(
  target: SpotlightRect | null,
  cardSize: { width: number; height: number },
  viewport: { width: number; height: number }
): CardPosition {
  const vw = viewport.width;
  const vh = viewport.height;
  const maxCardW = Math.max(260, vw - VIEWPORT_MARGIN * 2);
  const maxCardH = Math.max(220, vh - VIEWPORT_MARGIN * 2);
  const cw = Math.min(cardSize.width, maxCardW);
  const ch = Math.min(cardSize.height, maxCardH);

  const centered: CardPosition = {
    top: clampNumber((vh - ch) / 2, VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN),
    left: clampNumber((vw - cw) / 2, VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN),
    placement: 'center',
    arrowOffset: null
  };

  if (!target) return centered;

  const areaRatio = (target.width * target.height) / Math.max(1, vw * vh);
  const fillsViewport =
    areaRatio > 0.5 || (target.width > vw * 0.72 && target.height > vh * 0.62);

  if (fillsViewport) return centered;

  const spaceBelow = vh - target.bottom - CARD_GAP - VIEWPORT_MARGIN;
  const spaceAbove = target.top - CARD_GAP - VIEWPORT_MARGIN;
  const spaceRight = vw - target.right - CARD_GAP - VIEWPORT_MARGIN;
  const spaceLeft = target.left - CARD_GAP - VIEWPORT_MARGIN;

  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;

  if (spaceBelow >= ch) {
    const left = clampNumber(targetCenterX - cw / 2, VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN);
    const top = clampNumber(target.bottom + CARD_GAP, VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN);
    return {
      top,
      left,
      placement: 'bottom',
      arrowOffset: clampNumber(targetCenterX - left, 24, cw - 24)
    };
  }

  if (spaceAbove >= ch) {
    const left = clampNumber(targetCenterX - cw / 2, VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN);
    const top = clampNumber(target.top - CARD_GAP - ch, VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN);
    return {
      top,
      left,
      placement: 'top',
      arrowOffset: clampNumber(targetCenterX - left, 24, cw - 24)
    };
  }

  if (spaceRight >= cw) {
    const left = clampNumber(target.right + CARD_GAP, VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN);
    const top = clampNumber(targetCenterY - ch / 2, VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN);
    return {
      top,
      left,
      placement: 'right',
      arrowOffset: clampNumber(targetCenterY - top, 24, ch - 24)
    };
  }

  if (spaceLeft >= cw) {
    const left = clampNumber(target.left - CARD_GAP - cw, VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN);
    const top = clampNumber(targetCenterY - ch / 2, VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN);
    return {
      top,
      left,
      placement: 'left',
      arrowOffset: clampNumber(targetCenterY - top, 24, ch - 24)
    };
  }

  return centered;
}

export const OnboardingWizard: React.FC<Props> = ({
  isOpen,
  initialStep = 1,
  onChangeView,
  onSetDrawerOpen,
  onStepChange,
  onSkip,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState<number>(() => clampStep(initialStep));
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  }));
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: 416,
    height: 390
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const callbacksRef = useRef({
    onChangeView,
    onSetDrawerOpen,
    onStepChange,
    onSkip,
    onComplete
  });
  callbacksRef.current = {
    onChangeView,
    onSetDrawerOpen,
    onStepChange,
    onSkip,
    onComplete
  };

  // Reset step cleanly whenever the wizard opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setCurrentStep(clampStep(initialStep));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialStep]);

  const activeStep = TOUR_STEPS[currentStep - 1] ?? TOUR_STEPS[0];

  const syncMeasurements = useCallback(() => {
    if (typeof window === 'undefined') return;
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    setSpotlightRect(measureSpotlightRect(activeStep.target));
  }, [activeStep.target]);

  // Trigger workspace view / drawer switch and measure spotlight target
  useEffect(() => {
    if (!isOpen) return;

    callbacksRef.current.onChangeView(activeStep.view);
    callbacksRef.current.onSetDrawerOpen?.(Boolean(activeStep.openDrawer));
    callbacksRef.current.onStepChange?.(activeStep.id);

    // Measure immediately if target is already mounted, then re-measure after 120ms & 320ms
    const rafId = window.requestAnimationFrame(() => {
      const immediateRect = measureSpotlightRect(activeStep.target);
      if (immediateRect) {
        setSpotlightRect(immediateRect);
      }
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    });

    const primaryTimer = window.setTimeout(() => {
      syncMeasurements();
    }, 120);

    const settleTimer = window.setTimeout(() => {
      syncMeasurements();
    }, 320);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(primaryTimer);
      window.clearTimeout(settleTimer);
    };
  }, [isOpen, activeStep, syncMeasurements]);

  // Keep spotlight aligned on resize, scroll, and target layout mutations
  useEffect(() => {
    if (!isOpen) return;

    const handleViewportChange = () => {
      syncMeasurements();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    let resizeObserver: ResizeObserver | null = null;
    const attachObserver = () => {
      if (typeof ResizeObserver === 'undefined') return;
      const targetEl = document.querySelector(activeStep.target);
      if (targetEl) {
        resizeObserver = new ResizeObserver(() => {
          syncMeasurements();
        });
        resizeObserver.observe(targetEl);
      }
    };

    const observerTimer = window.setTimeout(attachObserver, 140);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.clearTimeout(observerTimer);
      resizeObserver?.disconnect();
    };
  }, [isOpen, activeStep.target, syncMeasurements]);

  // Measure the actual callout card dimensions so clamping is always exact
  useLayoutEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const updateCardSize = () => {
      if (!dialogRef.current) return;
      const rect = dialogRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCardSize((prev) =>
          Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1
            ? { width: rect.width, height: rect.height }
            : prev
        );
      }
    };

    updateCardSize();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateCardSize);
      ro.observe(dialogRef.current);
      return () => ro.disconnect();
    }
  }, [isOpen, currentStep, viewport.width]);

  // Focus dialog container on open for accessibility and clean keyboard capture
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep >= TOTAL_STEPS) {
      callbacksRef.current.onComplete();
    } else {
      setCurrentStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    callbacksRef.current.onSkip();
  }, []);

  // Keyboard navigation while open: Escape -> Skip, ArrowRight -> Next/Complete, ArrowLeft -> Prev
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleSkip();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (currentStep > 1) {
          handlePrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, handleNext, handlePrev, handleSkip]);

  if (!isOpen) return null;

  const cardPosition = computeCardPosition(spotlightRect, cardSize, viewport);
  const StepIcon = activeStep.icon;
  const isEmerald = activeStep.accent === 'emerald';
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;
  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  const spotlightShadow = isEmerald
    ? '0 0 0 9999px rgba(15, 23, 42, 0.58), 0 0 0 2.5px rgba(16, 185, 129, 0.95), 0 0 28px 4px rgba(16, 185, 129, 0.38)'
    : '0 0 0 9999px rgba(15, 23, 42, 0.58), 0 0 0 2.5px rgba(14, 165, 233, 0.95), 0 0 28px 4px rgba(56, 189, 248, 0.38)';

  const renderCaret = () => {
    if (cardPosition.placement === 'center' || cardPosition.arrowOffset === null) {
      return null;
    }

    const baseClass =
      'pointer-events-none absolute w-3 h-3 bg-white border-slate-200 rotate-45 z-10';

    if (cardPosition.placement === 'bottom') {
      return (
        <div
          aria-hidden="true"
          className={`${baseClass} -top-[7px] border-l border-t`}
          style={{ left: cardPosition.arrowOffset - 6 }}
        />
      );
    }

    if (cardPosition.placement === 'top') {
      return (
        <div
          aria-hidden="true"
          className={`${baseClass} -bottom-[7px] border-r border-b`}
          style={{ left: cardPosition.arrowOffset - 6 }}
        />
      );
    }

    if (cardPosition.placement === 'right') {
      return (
        <div
          aria-hidden="true"
          className={`${baseClass} -left-[7px] border-l border-b`}
          style={{ top: cardPosition.arrowOffset - 6 }}
        />
      );
    }

    return (
      <div
        aria-hidden="true"
        className={`${baseClass} -right-[7px] border-r border-t`}
        style={{ top: cardPosition.arrowOffset - 6 }}
      />
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] select-none"
      aria-live="polite"
    >
      {/* Full-viewport interaction blocker + fallback backdrop when no target rect exists */}
      <div
        aria-hidden="true"
        className="fixed inset-0 transition-colors duration-300"
        style={{
          backgroundColor: spotlightRect ? 'transparent' : 'rgba(15, 23, 42, 0.58)'
        }}
      />

      {/* Crystal-clear glowing spotlight cutout */}
      {spotlightRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl transition-[top,left,width,height,box-shadow] duration-300 ease-out"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            boxShadow: spotlightShadow
          }}
        >
          <div
            className={`absolute -inset-1 rounded-2xl border-2 opacity-60 animate-pulse ${
              isEmerald ? 'border-emerald-300' : 'border-sky-300'
            }`}
          />
        </div>
      )}

      {/* Smart-positioned Tinkercad-light onboarding callout card */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-wizard-title"
        aria-describedby="onboarding-wizard-desc"
        tabIndex={-1}
        className="fixed z-[72] w-[min(416px,calc(100vw-32px))] outline-none transition-[top,left] duration-300 ease-out"
        style={{
          top: cardPosition.top,
          left: cardPosition.left
        }}
      >
        {renderCaret()}

        <div className="relative flex flex-col max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl">
          {/* Top metadata row: Paso X de 5 + Omitir tutorial */}
          <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight shrink-0 ${
                  isEmerald
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    : 'bg-sky-50 text-sky-700 border border-sky-200/80'
                }`}
              >
                Paso {currentStep} de {TOTAL_STEPS}
              </span>
              <span className="hidden sm:inline-block truncate text-[11px] font-semibold text-slate-400">
                {activeStep.badge}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              title="Omitir tutorial (Esc)"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <span>Omitir tutorial</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-5 pt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  isEmerald
                    ? 'bg-gradient-to-r from-sky-500 to-emerald-500'
                    : 'bg-gradient-to-r from-sky-500 to-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Main step content */}
          <div className="px-5 pt-4 pb-4 space-y-3.5">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isEmerald
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                    : 'bg-gradient-to-br from-sky-500 to-blue-600 text-white'
                }`}
              >
                <StepIcon className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="onboarding-wizard-title"
                  className="text-base font-extrabold tracking-tight text-slate-900 leading-snug"
                >
                  {activeStep.title}
                </h2>
                <p
                  className={`text-xs font-semibold mt-0.5 leading-snug ${
                    isEmerald ? 'text-emerald-600' : 'text-sky-600'
                  }`}
                >
                  {activeStep.subtitle}
                </p>
              </div>
            </div>

            <p
              id="onboarding-wizard-desc"
              className="text-[13px] leading-relaxed text-slate-600"
            >
              {activeStep.description}
            </p>

            {/* Key highlights list */}
            <ul className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2">
              {activeStep.tips.map((tip, index) => (
                <li
                  key={`${activeStep.id}-tip-${index}`}
                  className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      isEmerald ? 'text-emerald-600' : 'text-sky-600'
                    }`}
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>

            {/* Interactive step dots + subtle keyboard hint */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Pasos del tutorial">
                {TOUR_STEPS.map((step) => {
                  const isCurrent = step.id === currentStep;
                  const isCompleted = step.id < currentStep;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={`Ir al paso ${step.id}: ${step.title}`}
                      onClick={() => setCurrentStep(step.id)}
                      className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                        isCurrent
                          ? `w-6 ${isEmerald ? 'bg-emerald-500' : 'bg-sky-500'}`
                          : isCompleted
                            ? `w-2 ${isEmerald ? 'bg-emerald-300 hover:bg-emerald-400' : 'bg-sky-300 hover:bg-sky-400'}`
                            : 'w-2 bg-slate-200 hover:bg-slate-300'
                      }`}
                    />
                  );
                })}
              </div>

              <span className="hidden sm:inline-block text-[10px] font-medium text-slate-400">
                Flechas para navegar · Esc para omitir
              </span>
            </div>
          </div>

          {/* Footer navigation bar */}
          <div className="flex items-center justify-between gap-2 px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                isFirstStep
                  ? 'text-slate-300 bg-transparent cursor-not-allowed'
                  : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>¡Empezar a diseñar!</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm active:scale-[0.98] transition-all cursor-pointer ${
                  isEmerald
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-sky-600 hover:bg-sky-500'
                }`}
              >
                <span>Siguiente</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
