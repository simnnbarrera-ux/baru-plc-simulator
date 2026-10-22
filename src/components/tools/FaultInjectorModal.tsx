import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Flame, 
  ZapOff, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  GraduationCap, 
  Gauge, 
  Wrench, 
  ShieldAlert, 
  Clock, 
  Award, 
  Lightbulb, 
  Radio, 
  Sparkles,
  Zap,
  Activity,
  Layers,
  Volume2,
  X
} from 'lucide-react';
import { FAULT_CATALOG, FaultDefinition, FaultId, ExamSession } from '../../types/faults';
import { SimulationState } from '../../types/simulation';
import { soundEffects } from '../../core/simulation/soundEffects';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeFaults: Set<string>;
  onToggleFault: (faultId: FaultId) => void;
  onResetFaults: () => void;
  examSession: ExamSession;
  onStartExam: (hiddenFaultId: FaultId) => void;
  onSubmitExamAnswer: (answer: FaultId, notes: string) => void;
  onResetExam: () => void;
  onOpenMultimeter: () => void;
  simulationState: SimulationState;
}

export const FaultInjectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeFaults,
  onToggleFault,
  onResetFaults,
  examSession,
  onStartExam,
  onSubmitExamAnswer,
  onResetExam,
  onOpenMultimeter,
  simulationState
}) => {
  const [activeTab, setActiveTab] = useState<'workshop' | 'exam' | 'tester'>('workshop');
  const [selectedStudentAnswer, setSelectedStudentAnswer] = useState<FaultId | null>(null);
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [voltageProbePoint, setVoltageProbePoint] = useState<string>('L1_L2');
  const [voltageProbeResult, setVoltageProbeResult] = useState<{ voltage: number; hasContinuity: boolean; label: string } | null>(null);

  // Cronómetro del examen en vivo
  useEffect(() => {
    let timer: any = null;
    if (examSession.isActive && examSession.startedAt) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - examSession.startedAt!) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(timer);
  }, [examSession.isActive, examSession.startedAt]);

  // Si se abre en modo examen activo, abrir pestaña de examen
  useEffect(() => {
    if (examSession.isActive) {
      setActiveTab('exam');
    }
  }, [examSession.isActive]);

  if (!isOpen) return null;

  const isSimulating = simulationState.mode === 'running';

  // Manejador para generar examen con falla aleatoria
  const handleGenerateExam = () => {
    onResetFaults();
    // Elegir aleatoriamente entre las fallas pedagógicas
    const possibleFaults: FaultId[] = [
      'phase_loss_l2',
      'phase_loss_l3',
      'thermal_overload',
      'short_circuit',
      'open_coil_km1',
      'welded_contact_km1'
    ];
    const randomIndex = Math.floor(Math.random() * possibleFaults.length);
    const chosenFault = possibleFaults[randomIndex];
    
    setSelectedStudentAnswer(null);
    setStudentNotes('');
    onStartExam(chosenFault);
    soundEffects.playTripClick();
  };

  const handleSubmitAnswer = () => {
    if (!selectedStudentAnswer) return;
    onSubmitExamAnswer(selectedStudentAnswer, studentNotes);
  };

  // Comprobador rápido bipolar de tensión (DDT / Buscapolos virtual)
  const handleTestProbe = (pointKey: string) => {
    setVoltageProbePoint(pointKey);

    let volt = 0;
    let continuity = false;
    let desc = '';

    const isL2Cut = activeFaults.has('phase_loss_l2') || activeFaults.has('fase_cortada');
    const isL3Cut = activeFaults.has('phase_loss_l3');
    const isThermalTripped = activeFaults.has('thermal_overload');
    const isOpenCoil = activeFaults.has('open_coil_km1') || activeFaults.has('bobina_abierta');
    const isWelded = activeFaults.has('welded_contact_km1') || activeFaults.has('contacto_soldado');
    const isKm1On = simulationState.activeCoils.has('-KM1');

    switch (pointKey) {
      case 'L1_L2':
        volt = isSimulating ? (isL2Cut ? 0 : 400) : 0;
        desc = isL2Cut ? '0 V AC (¡Falta de potencial en Fase L2!)' : '400 V AC Trifásica equilibrada';
        break;
      case 'L2_L3':
        volt = isSimulating ? ((isL2Cut || isL3Cut) ? 0 : 400) : 0;
        desc = (isL2Cut || isL3Cut) ? '0 V AC (Asimetría en fase cortada)' : '400 V AC';
        break;
      case 'L1_L3':
        volt = isSimulating ? (isL3Cut ? 0 : 400) : 0;
        desc = isL3Cut ? '0 V AC' : '400 V AC (Fases sanas alimentadas)';
        break;
      case 'L1_N':
        volt = isSimulating ? 230 : 0;
        desc = '230 V AC Fase L1 - Neutro (Alimentación de mando OK)';
        break;
      case 'L2_N':
        volt = isSimulating ? (isL2Cut ? 0 : 230) : 0;
        desc = isL2Cut ? '0 V AC (Conductor L2 seccionado)' : '230 V AC';
        break;
      case 'F1_95_96':
        continuity = !isThermalTripped;
        volt = isThermalTripped ? 230 : 0; // Caída de tensión a través del contacto abierto
        desc = isThermalTripped 
          ? 'Contacto 95-96 ABIERTO (O.L / Caída 230V: Disparo por Sobrecarga Térmica)' 
          : 'Contacto 95-96 CERRADO (Continuidad OK, 0 Ω)';
        break;
      case 'KM1_A1_A2':
        volt = isKm1On || (isSimulating && !isThermalTripped) ? 230 : 0;
        desc = isOpenCoil
          ? '230 V AC presentes en bornas, pero la bobina interna está CORTADA (R = O.L)'
          : (volt === 230 ? '230 V AC (Bobina energizada normalmente)' : '0 V AC (Sin excitación)');
        break;
      case 'M1_TERMINALS':
        volt = isKm1On || isWelded ? (isL2Cut || isL3Cut ? 230 : 400) : 0;
        desc = (isKm1On || isWelded)
          ? (isL2Cut ? 'Asimetría severa en U-V-W. Motor zumbando con sobrecorriente' : '400 V AC equilibrado en motor')
          : '0 V AC (Motor desenergizado)';
        break;
      case 'KM1_CONTACTS':
        continuity = isWelded;
        volt = isWelded || isKm1On ? 400 : 0;
        desc = isWelded
          ? 'Contactos de potencia 1-2, 3-4, 5-6 SOLDADOS (Continuidad 0.0 Ω sin excitación). El motor no se detiene.'
          : (isKm1On ? '400 V AC (Contactor enclavado en marcha normal)' : '0 V AC (Contactos abiertos en reposo)');
        break;
      case 'KM1_13_14':
        continuity = isWelded || isKm1On;
        volt = isSimulating && (isWelded || isKm1On) ? 230 : 0;
        desc = isWelded
          ? 'Contacto auxiliar 13-14 SOLDADO (Continuidad permanente, 0.0 Ω). Realimentación forzada constante.'
          : (isKm1On ? 'Contacto 13-14 CERRADO (Bobina activa)' : 'Contacto 13-14 ABIERTO (En reposo)');
        break;
      default:
        volt = 0;
        desc = 'Punto no medido';
    }

    if (volt > 0) {
      soundEffects.playContinuityBeep(120);
    } else if (continuity) {
      soundEffects.playContinuityBeep(350);
    }

    setVoltageProbeResult({ voltage: volt, hasContinuity: continuity, label: desc });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden font-sans">
        
        {/* CABECERA DEL INYECTOR DE AVERIAS */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white font-sans">
                  Inyector & Diagnóstico Didáctico de Averías Eléctricas
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full">
                  Mantenimiento Industrial
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Diagnóstico de Averías en Automatismos Eléctricos, Relés y Motores (IEC 60364)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeFaults.size > 0 && !examSession.isActive && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                {activeFaults.size} {activeFaults.size === 1 ? 'Avería Inyectada' : 'Averías Inyectadas'}
              </span>
            )}

            {examSession.isActive && (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                EXAMEN: {formatSeconds(elapsedTime)}
              </span>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('workshop')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'workshop'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-4 h-4 text-indigo-600" />
            <span>Taller de Inyección de Averías (Práctica Libre)</span>
          </button>

          <button
            onClick={() => setActiveTab('exam')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'exam'
                ? 'border-amber-600 text-amber-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <span>Modo Evaluación de Diagnóstico</span>
            {examSession.isActive && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tester')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'tester'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Gauge className="w-4 h-4 text-emerald-600" />
            <span>Comprobador de Tensión Bipolar / Puntas Rápidas</span>
          </button>
        </div>

        {/* CONTENIDO DE LAS PESTAÑAS */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          
          {/* ============================================================ */}
          {/* PESTAÑA 1: TALLER DE INYECCIÓN DE AVERÍAS (MODO LIBRE) */}
          {/* ============================================================ */}
          {activeTab === 'workshop' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">
                      Banco de Ensayos Electrotécnicos de Averías
                    </h4>
                    <p className="text-[11px] text-blue-700">
                      Activa o desactiva fallas físicas para observar su efecto nodal en tiempo real sobre el contactor -KM1, motor -M1 y guardamotor -Q1.
                    </p>
                  </div>
                </div>

                {activeFaults.size > 0 && (
                  <button
                    onClick={onResetFaults}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg border border-rose-300 transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Eliminar Todas las Averías</span>
                  </button>
                )}
              </div>

              {/* GRILLA DE LAS 4 FALLAS TÍPICAS DE TALLER Y EXAMEN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. FALLA DE FASE (CORTE L2 O L3) */}
                <div className={`p-4 rounded-xl border transition-all ${
                  activeFaults.has('phase_loss_l2') || activeFaults.has('phase_loss_l3')
                    ? 'bg-amber-50/70 border-amber-400 shadow-md ring-1 ring-amber-400'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        activeFaults.has('phase_loss_l2') || activeFaults.has('phase_loss_l3')
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <ZapOff className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          1. Falla de Fase (Corte L2 o L3)
                        </h3>
                        <span className="text-[10px] font-mono text-amber-700 font-bold">
                          Asimetría Trifásica & Sobreintensidad (RETIE)
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    Simula la interrupción accidental del conductor de fase. Al arrancar el motor -M1 se genera una asimetría total con tensión de 0V en la fase cortada, zumbido característico y sobreintensidad masiva (&gt;18A).
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onToggleFault('phase_loss_l2')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        activeFaults.has('phase_loss_l2')
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {activeFaults.has('phase_loss_l2') ? '✓ Cortar Conductor L2 (Activo)' : 'Cortar Fase L2'}
                    </button>

                    <button
                      onClick={() => onToggleFault('phase_loss_l3')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        activeFaults.has('phase_loss_l3')
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {activeFaults.has('phase_loss_l3') ? '✓ Cortar Conductor L3 (Activo)' : 'Cortar Fase L3'}
                    </button>
                  </div>
                </div>

                {/* 2. DISPARO POR SOBRECARGA TÉRMICA (-F1) */}
                <div className={`p-4 rounded-xl border transition-all ${
                  activeFaults.has('thermal_overload')
                    ? 'bg-orange-50/70 border-orange-400 shadow-md ring-1 ring-orange-400'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        activeFaults.has('thermal_overload')
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          2. Disparo por Sobrecarga Térmica
                        </h3>
                        <span className="text-[10px] font-mono text-orange-700 font-bold">
                          Relé Térmico -F1 • Contacto NC 95-96 Abierto
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    Apertura forzada del contacto bimetálico 95-96 del relé de protección -F1. La línea de maniobra se interrumpe y el pulsador de marcha -S1 no logra energizar la bobina de -KM1.
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => onToggleFault('thermal_overload')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        activeFaults.has('thermal_overload')
                          ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {activeFaults.has('thermal_overload') ? '✓ Térmico 95-96 Disparado (Activo)' : 'Disparar Relé Térmico -F1'}
                    </button>

                    {activeFaults.has('thermal_overload') && (
                      <button
                        onClick={() => {
                          onToggleFault('thermal_overload');
                          soundEffects.playTripClick();
                        }}
                        title="Presionar el botón azul de rearme manual del relé térmico"
                        className="py-1.5 px-3 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 border border-blue-700 shadow-xs flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Azul -F1</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. CORTOCIRCUITO FRANCO FASE-NEUTRO / FASE-FASE */}
                <div className={`p-4 rounded-xl border transition-all ${
                  activeFaults.has('short_circuit')
                    ? 'bg-rose-50/70 border-rose-500 shadow-md ring-1 ring-rose-500'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        activeFaults.has('short_circuit')
                          ? 'bg-rose-600 text-white animate-bounce'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          3. Cortocircuito Franco (Icc &gt; 150A)
                        </h3>
                        <span className="text-[10px] font-mono text-rose-700 font-bold">
                          Disparo Magnético Instantáneo Guardamotor -Q1
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    Unión de impedancia casi nula entre conductores activos. Provoca disparo electromagnético instantáneo en &lt;10ms del guardamotor -Q1 con aviso acústico/visual de arco voltaico.
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        onToggleFault('short_circuit');
                        soundEffects.playShortCircuitBang();
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        activeFaults.has('short_circuit')
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs animate-pulse'
                          : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                      }`}
                    >
                      {activeFaults.has('short_circuit') ? '⚡ Cortocircuito Franco Activo' : '⚡ Provocar Cortocircuito en -Q1'}
                    </button>
                  </div>
                </div>

                {/* 4. FALLA DE BOBINA ABIERTA (-KM1) */}
                <div className={`p-4 rounded-xl border transition-all ${
                  activeFaults.has('open_coil_km1')
                    ? 'bg-purple-50/70 border-purple-400 shadow-md ring-1 ring-purple-400'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        activeFaults.has('open_coil_km1')
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Radio className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          4. Bobina Abierta en Contactor (-KM1)
                        </h3>
                        <span className="text-[10px] font-mono text-purple-700 font-bold">
                          Devanado A1-A2 Cortado • Resistencia O.L ∞ Ω
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    El solenoide electromagnético tiene su espira de cobre cortada. Al dar marcha (-S1), el multímetro registra 230V AC entre A1 y A2, pero el electroimán no enclava y los contactos no cierran.
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => onToggleFault('open_coil_km1')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        activeFaults.has('open_coil_km1') || activeFaults.has('bobina_abierta')
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {activeFaults.has('open_coil_km1') || activeFaults.has('bobina_abierta') ? '✓ Bobina Abierta -KM1 (Activa)' : 'Abrir Bobina Contactor -KM1'}
                    </button>
                  </div>
                </div>

                {/* 5. CONTACTO SOLDADO EN CONTACTOR (-KM1) */}
                <div className={`p-4 rounded-xl border transition-all ${
                  activeFaults.has('welded_contact_km1') || activeFaults.has('contacto_soldado')
                    ? 'bg-red-50/70 border-red-500 shadow-md ring-1 ring-red-500'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        activeFaults.has('welded_contact_km1') || activeFaults.has('contacto_soldado')
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          5. Contacto Soldado en Contactor (-KM1)
                        </h3>
                        <span className="text-[10px] font-mono text-red-700 font-bold">
                          Polos 1-2, 3-4, 5-6 & NA 13-14 • No Responde a Parada
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    Fusión de las pastillas bimetálicas por sobrecorriente o arco. Los contactos permanecen permanentemente cerrados conduciendo energía hacia el motor, ignorando el pulsador de parada.
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => onToggleFault('welded_contact_km1')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        activeFaults.has('welded_contact_km1') || activeFaults.has('contacto_soldado')
                          ? 'bg-red-600 text-white border-red-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {activeFaults.has('welded_contact_km1') || activeFaults.has('contacto_soldado') ? '✓ Contactos Soldados -KM1 (Activo)' : 'Soldar Contactos Contactor -KM1'}
                    </button>
                  </div>
                </div>

              </div>

              {/* GUÍA TÉCNICA DE LOCALIZACIÓN DE AVERÍAS */}
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 font-mono text-xs">
                <div className="flex items-center justify-between text-amber-400 font-bold mb-2">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4" />
                    <span>PROTOCOLO DE LOCALIZACIÓN DE AVERÍAS</span>
                  </div>
                  <button
                    onClick={onOpenMultimeter}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded transition-colors"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Abrir Multímetro Fluke 87V</span>
                  </button>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  1. Medir tensión fase-fase (400V) y fase-neutro (230V) en la cabecera del cuadro. <br />
                  2. Verificar posición y continuidad de protecciones (-Q1 y -F1 contacto 95-96). <br />
                  3. Si la tensión llega a A1-A2 pero -KM1 no enclava, desenergizar y medir resistencia óhmica (sana: ~560Ω, defectuosa: O.L). <br />
                  4. En caso de sobreintensidad con motor zumbando, comprobar asimetría de tensiones de alimentación.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PESTAÑA 2: MODO EVALUACIÓN DE DIAGNÓSTICO */}
          {/* ============================================================ */}
          {activeTab === 'exam' && (
            <div className="space-y-6">
              
              {/* TARJETA DE ESTADO DE EVALUACIÓN */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-lg border border-indigo-500/30">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-extrabold text-xl shadow-md">
                      EX
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          Módulo de Evaluación de Diagnóstico
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Certificación Técnica
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Automatismos, Control Industrial y Mantenimiento Electrotécnico
                      </p>
                    </div>
                  </div>

                  {!examSession.isActive ? (
                    <button
                      onClick={handleGenerateExam}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Activar Falla Oculta Aleatoria (Iniciar Examen)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-amber-300 font-mono">TIEMPO EN CURSO</div>
                        <div className="text-lg font-mono font-extrabold text-white">
                          {formatSeconds(elapsedTime)}
                        </div>
                      </div>
                      <button
                        onClick={onResetExam}
                        className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                      >
                        Reiniciar Examen
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* PANEL DE EXAMEN ACTIVO */}
              {examSession.isActive ? (
                <div className="space-y-6">
                  {/* ALERTA DE EXAMEN EN PROCESO */}
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500 text-slate-900 rounded-lg animate-pulse">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-950">
                          Examen Práctico en Curso • Módulo de Diagnóstico
                        </h4>
                        <p className="text-[11px] text-amber-800">
                          Hay 1 falla real inyectada de forma oculta en el circuito. Pon en marcha la simulación, usa el multímetro o el comprobador de tensión y determina la causa raíz.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={onOpenMultimeter}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-lg shadow-xs transition-colors"
                      >
                        <Gauge className="w-4 h-4" />
                        <span>Abrir Multímetro Fluke</span>
                      </button>
                    </div>
                  </div>

                  {/* FORMULARIO DE RESPUESTA DE DIAGNOSTICO */}
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>Diagnóstico Técnico: ¿Cuál es el componente averiado o causa del fallo?</span>
                    </h4>

                    {/* OPCIONES DE SELECCIÓN MÚLTIPLE / RADIO */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {FAULT_CATALOG.map((f) => {
                        const isSelected = selectedStudentAnswer === f.id;
                        return (
                          <label
                            key={f.id}
                            onClick={() => setSelectedStudentAnswer(f.id)}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="student_diagnosis"
                              checked={isSelected}
                              onChange={() => setSelectedStudentAnswer(f.id)}
                              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <div className="text-xs font-bold text-slate-900">
                                {f.examQuestionTitle}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Afecta: {f.affectedTag} • {f.category.toUpperCase()}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* NOTAS TÉCNICAS DE MEDICIÓN */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-bold text-slate-700">
                        Bitácora de Mediciones Electrotécnicas (Notas de Campo):
                      </label>
                      <textarea
                        value={studentNotes}
                        onChange={(e) => setStudentNotes(e.target.value)}
                        placeholder="Ejemplo: 'Medí tensión en bornas A1-A2 con pulsador presionado y da 230V AC, pero al medir continuidad en Ω con el circuito abierto marca O.L, lo que confirma devanado cortado...'"
                        rows={3}
                        className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800 bg-white"
                      />
                    </div>

                    {/* BOTÓN DE CONFIRMACIÓN DE DIAGNÓSTICO */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedStudentAnswer}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
                      >
                        <Award className="w-4 h-4" />
                        <span>Confirmar Diagnóstico Técnico</span>
                      </button>
                    </div>
                  </div>

                  {/* CALIFICACIÓN Y FEEDBACK DIDÁCTICO OFICIAL */}
                  {examSession.isPassed !== null && (
                    <div className={`p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-2 ${
                      examSession.isPassed
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-md'
                        : 'bg-rose-50 border-rose-400 text-rose-950 shadow-md'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {examSession.isPassed ? (
                            <div className="p-3 bg-emerald-600 text-white rounded-xl">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                          ) : (
                            <div className="p-3 bg-rose-600 text-white rounded-xl">
                              <XCircle className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold">
                                {examSession.isPassed 
                                  ? '¡DIAGNÓSTICO TÉCNICO CORRECTO!' 
                                  : 'DIAGNÓSTICO INCORRECTO - REINTENTA'}
                              </h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                                examSession.isPassed
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-rose-200 text-rose-900'
                              }`}>
                                Calificación: {examSession.score?.toFixed(1)} / 5.0
                              </span>
                            </div>
                            <p className="text-xs mt-1 leading-relaxed">
                              {examSession.feedback}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* EXPLICACIÓN DETALLADA SEGÚN RETIE Y NORMATIVA IEC */}
                      <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-mono bg-white/70 p-3 rounded-xl space-y-1.5">
                        <div className="font-bold text-slate-900">
                          INFORME TÉCNICO OFICIAL DE TALLER:
                        </div>
                        {FAULT_CATALOG.find(f => f.id === examSession.hiddenFaultId) && (
                          <>
                            <div className="text-slate-700">
                              • Causa Raíz: {FAULT_CATALOG.find(f => f.id === examSession.hiddenFaultId)?.name}
                            </div>
                            <div className="text-slate-700">
                              • Síntomas Clave: {FAULT_CATALOG.find(f => f.id === examSession.hiddenFaultId)?.symptoms}
                            </div>
                            <div className="text-slate-700">
                              • Solución en Taller: {FAULT_CATALOG.find(f => f.id === examSession.hiddenFaultId)?.correctiveAction}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          onClick={handleGenerateExam}
                          className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors"
                        >
                          Nuevo Ejercicio de Examen
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* ESTADO INICIAL ANTES DE COMENZAR EL EXAMEN */
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-base font-bold text-slate-900">
                      Evaluación de Diagnóstico Práctico Industrial
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      El simulador inyectará en modo ciego una de las averías típicas de taller (corte de fase, disparo de relé térmico, cortocircuito en guardamotor o bobina abierta). Su misión es utilizar los instrumentos de medida virtuales para localizar la falla y justificar técnicamente su diagnóstico.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateExam}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Comenzar Examen Práctico Ahora</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ============================================================ */}
          {/* PESTAÑA 3: COMPROBADOR RÁPIDO DE TENSIÓN BIPOLAR (BUSCAPOLOS) */}
          {/* ============================================================ */}
          {activeTab === 'tester' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Comprobador Bipolar de Tensión & Continuidad (DDT / VAT Industrial)
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      Toca con las puntas de prueba los diferentes puntos del esquema para comprobar rápidamente presencia de potencial y continuidad.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onOpenMultimeter}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-xs transition-colors"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Ver Fluke 87V Completo</span>
                </button>
              </div>

              {/* SELECTOR DE PUNTOS DE TEST */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { key: 'L1_L2', name: 'Línea L1 - L2', category: 'Red Potencia (400V)' },
                  { key: 'L2_L3', name: 'Línea L2 - L3', category: 'Red Potencia (400V)' },
                  { key: 'L1_L3', name: 'Línea L1 - L3', category: 'Red Potencia (400V)' },
                  { key: 'L1_N', name: 'Línea L1 - Neutro', category: 'Red Mando (230V)' },
                  { key: 'L2_N', name: 'Línea L2 - Neutro', category: 'Fase 2 a Neutro' },
                  { key: 'F1_95_96', name: 'Térmico -F1 (95-96)', category: 'Contacto Protección' },
                  { key: 'KM1_A1_A2', name: 'Bobina -KM1 (A1-A2)', category: 'Solenoide Contactor' },
                  { key: 'KM1_CONTACTS', name: 'Polos -KM1 (1-2, 3-4, 5-6)', category: 'Contactos Principales' },
                  { key: 'KM1_13_14', name: 'Retención -KM1 (13-14)', category: 'Contacto Auxiliar NA' },
                  { key: 'M1_TERMINALS', name: 'Bornas Motor -M1', category: 'Bornas U1-V1-W1' }
                ].map((pt) => {
                  const isSelected = voltageProbePoint === pt.key;
                  return (
                    <button
                      key={pt.key}
                      onClick={() => handleTestProbe(pt.key)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md font-bold'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{pt.name}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {pt.category}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* PANTALLA DE MEDICIÓN DEL COMPROBADOR */}
              {voltageProbeResult && (
                <div className="p-5 bg-slate-900 rounded-2xl border-4 border-slate-800 text-white font-mono shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                      MEDICIÓN EN: {voltageProbePoint.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-slate-300 font-sans">
                      {voltageProbeResult.label}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* ESCALA DE LEDS DE TENSIÓN TIPO COMPROBADOR FLUKE T5 / T150 */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      {[12, 24, 50, 120, 230, 400, 690].map((step) => {
                        const isLit = voltageProbeResult.voltage >= step;
                        return (
                          <div key={step} className="flex flex-col items-center">
                            <div className={`w-3.5 h-3.5 rounded-full transition-all ${
                              isLit
                                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                                : 'bg-slate-800'
                            }`} />
                            <span className="text-[8px] text-slate-500 mt-1 font-mono">{step}V</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-wider">
                        {voltageProbeResult.voltage} <span className="text-lg">V</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold">
                        {voltageProbeResult.voltage > 0 ? '⚡ TENSIÓN DETECTADA' : '○ SIN TENSIÓN'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* PIE DE PÁGINA */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-t border-slate-200 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sistema Conectado al Solucionador Nodal de Simulación</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
          >
            Cerrar Panel
          </button>
        </div>

      </div>
    </div>
  );
};

const TerminalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);
