import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Binary, 
  Workflow, 
  FileText, 
  Clock, 
  Zap, 
  Table, 
  Code, 
  ChevronDown, 
  Copy, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Maximize2
} from 'lucide-react';
import { CircuitDocument } from '../../types/circuit';
import { SimulationState } from '../../types/simulation';

// ==========================================
// MODELOS DE DATOS IEC 61131-3 & GRAFCET
// ==========================================

export type ContactInstruction = 'LD' | 'AND' | 'OR' | 'LDN' | 'ANDN' | 'ORN';
export type ContactType = 'NO' | 'NC'; // NO = Normalmente Abierto, NC = Normalmente Cerrado
export type CoilType = 'OUT' | 'SET' | 'RESET';

export interface LadderContact {
  id: string;
  type: ContactType;          // 'NO' o 'NC'
  instruction: ContactInstruction;
  address: string;            // ej: "%I0.0", "%I0.1", "%Q0.0", "%M0.0", "T1.Q"
  tag?: string;                // ej: "-S1", "-S2", "-KM1"
}

export interface LadderCoil {
  id: string;
  type: CoilType;             // 'OUT', 'SET', 'RESET'
  address: string;            // ej: "%Q0.0", "%Q0.1", "%M0.0"
  tag?: string;                // ej: "-KM1", "-H1"
}

export interface LadderTimer {
  id: string;
  name: string;               // ej: "T1"
  presetSeconds: number;      // PT (Preset Time) en segundos
  elapsedSeconds: number;     // ET (Elapsed Time) en segundos
  isDone: boolean;            // Q
  isActive: boolean;
}

export interface LadderBranch {
  id: string;
  contacts: LadderContact[];
}

export interface LadderRung {
  id: string;
  number: number;
  comment: string;
  branches: LadderBranch[];   // Ramas paralelas (OR)
  seriesContacts: LadderContact[]; // Contactos en serie después de las ramas
  coils: LadderCoil[];        // Bobinas de salida
  timer?: LadderTimer;        // Bloque TON opcional
}

export interface IOMapping {
  address: string;            // ej: "%I0.0"
  type: 'DI' | 'DQ' | 'M' | 'TIMER';
  schematicTag: string;       // ej: "-S1"
  name: string;               // ej: "Pulsador Marcha (NO)"
  description: string;
  forcedValue?: boolean;      // Si el usuario forzó el valor
}

export interface GrafcetStep {
  id: number;
  name: string;
  isInitial: boolean;
  isActive: boolean;
  action: string;             // ej: "%Q0.0 := 1"
  actionDescription: string;  // ej: "Activar Contactor Motor -KM1"
}

export interface GrafcetTransition {
  id: number;
  fromStep: number;
  toStep: number;
  condition: string;          // ej: "%I0.0 AND NOT %I0.1"
  conditionDescription: string; // ej: "Pulsar Marcha (-S1) y sin Parada"
}

// ==========================================
// MAPEO PREDETERMINADO DE ENTRADAS/SALIDAS
// ==========================================
const DEFAULT_IO_MAPPINGS: IOMapping[] = [
  {
    address: '%I0.0',
    type: 'DI',
    schematicTag: '-S1',
    name: 'Pulsador de Marcha',
    description: 'Contacto NA cableado a borna I0.0 de CPU S7-1200'
  },
  {
    address: '%I0.1',
    type: 'DI',
    schematicTag: '-S2',
    name: 'Pulsador de Parada',
    description: 'Contacto NC cableado a borna I0.1 para parada de emergencia/seguridad'
  },
  {
    address: '%I0.2',
    type: 'DI',
    schematicTag: '-S3',
    name: 'Final de Carrera / Sensor B1',
    description: 'Detector inductivo o fin de carrera de cinta transportadora'
  },
  {
    address: '%I0.3',
    type: 'DI',
    schematicTag: '-F1',
    name: 'Contacto Auxiliar Relé Térmico (97-98)',
    description: 'Señalización de sobrecarga térmica de motor trifásico'
  },
  {
    address: '%Q0.0',
    type: 'DQ',
    schematicTag: '-KM1',
    name: 'Contactor Principal Motor 3~',
    description: 'Salida de relé Q0.0 que alimenta bobina A1-A2 de -KM1'
  },
  {
    address: '%Q0.1',
    type: 'DQ',
    schematicTag: '-H1',
    name: 'Piloto Verde (Marcha)',
    description: 'Salida digital Q0.1 para indicación visual de motor activo'
  },
  {
    address: '%Q0.2',
    type: 'DQ',
    schematicTag: '-H2',
    name: 'Piloto Rojo (Fallo / Parada)',
    description: 'Salida digital Q0.2 para señalización de alarma o reposo'
  },
  {
    address: '%M0.0',
    type: 'M',
    schematicTag: 'MEM',
    name: 'Marca de Ciclo Automático',
    description: 'Bit interno de memoria para control de secuencia lógica'
  }
];

// Circuitos Predefinidos Educativos
const PRESET_DIRECT_STARTER: LadderRung[] = [
  {
    id: 'rung_0',
    number: 0,
    comment: 'Rung 0: Mando de Contactor Motor (-KM1) con Autoenclavamiento',
    branches: [
      {
        id: 'b_1',
        contacts: [
          { id: 'c_1', type: 'NO', instruction: 'LD', address: '%I0.0', tag: '-S1' }
        ]
      },
      {
        id: 'b_2',
        contacts: [
          { id: 'c_2', type: 'NO', instruction: 'OR', address: '%Q0.0', tag: '-KM1' }
        ]
      }
    ],
    seriesContacts: [
      { id: 'c_3', type: 'NC', instruction: 'ANDN', address: '%I0.1', tag: '-S2' }
    ],
    coils: [
      { id: 'q_1', type: 'OUT', address: '%Q0.0', tag: '-KM1' }
    ]
  },
  {
    id: 'rung_1',
    number: 1,
    comment: 'Rung 1: Señalización Luminosa de Marcha (Piloto Verde -H1)',
    branches: [],
    seriesContacts: [
      { id: 'c_4', type: 'NO', instruction: 'LD', address: '%Q0.0', tag: '-KM1' }
    ],
    coils: [
      { id: 'q_2', type: 'OUT', address: '%Q0.1', tag: '-H1' }
    ]
  },
  {
    id: 'rung_2',
    number: 2,
    comment: 'Rung 2: Señalización de Parada / Reposo (Piloto Rojo -H2)',
    branches: [],
    seriesContacts: [
      { id: 'c_5', type: 'NC', instruction: 'LDN', address: '%Q0.0', tag: '-KM1' }
    ],
    coils: [
      { id: 'q_3', type: 'OUT', address: '%Q0.2', tag: '-H2' }
    ]
  }
];

const PRESET_SET_RESET: LadderRung[] = [
  {
    id: 'rung_sr_0',
    number: 0,
    comment: 'Rung 0: Marcha con Bobina SET (S) mediante Pulsador -S1',
    branches: [],
    seriesContacts: [
      { id: 'c_sr_1', type: 'NO', instruction: 'LD', address: '%I0.0', tag: '-S1' }
    ],
    coils: [
      { id: 'q_sr_1', type: 'SET', address: '%Q0.0', tag: '-KM1' }
    ]
  },
  {
    id: 'rung_sr_1',
    number: 1,
    comment: 'Rung 1: Parada con Bobina RESET (R) mediante Pulsador -S2',
    branches: [],
    seriesContacts: [
      { id: 'c_sr_2', type: 'NO', instruction: 'LD', address: '%I0.1', tag: '-S2' }
    ],
    coils: [
      { id: 'q_sr_2', type: 'RESET', address: '%Q0.0', tag: '-KM1' }
    ]
  },
  {
    id: 'rung_sr_2',
    number: 2,
    comment: 'Rung 2: Retroalimentación a Piloto Verde -H1',
    branches: [],
    seriesContacts: [
      { id: 'c_sr_3', type: 'NO', instruction: 'LD', address: '%Q0.0', tag: '-KM1' }
    ],
    coils: [
      { id: 'q_sr_3', type: 'OUT', address: '%Q0.1', tag: '-H1' }
    ]
  }
];

const PRESET_TIMER_TON: LadderRung[] = [
  {
    id: 'rung_tm_0',
    number: 0,
    comment: 'Rung 0: Arranque de Motor Principal -KM1 con Enclavamiento',
    branches: [
      {
        id: 'b_tm_1',
        contacts: [
          { id: 'c_tm_1', type: 'NO', instruction: 'LD', address: '%I0.0', tag: '-S1' }
        ]
      },
      {
        id: 'b_tm_2',
        contacts: [
          { id: 'c_tm_2', type: 'NO', instruction: 'OR', address: '%Q0.0', tag: '-KM1' }
        ]
      }
    ],
    seriesContacts: [
      { id: 'c_tm_3', type: 'NC', instruction: 'ANDN', address: '%I0.1', tag: '-S2' }
    ],
    coils: [
      { id: 'q_tm_1', type: 'OUT', address: '%Q0.0', tag: '-KM1' }
    ]
  },
  {
    id: 'rung_tm_1',
    number: 1,
    comment: 'Rung 1: Temporizador TON T1 (Retardo a la Conexión de 4.0s para Fase Triángulo)',
    branches: [],
    seriesContacts: [
      { id: 'c_tm_4', type: 'NO', instruction: 'LD', address: '%Q0.0', tag: '-KM1' }
    ],
    coils: [],
    timer: {
      id: 'timer_1',
      name: 'T1',
      presetSeconds: 4.0,
      elapsedSeconds: 0,
      isDone: false,
      isActive: false
    }
  },
  {
    id: 'rung_tm_2',
    number: 2,
    comment: 'Rung 2: Activación de Piloto / Segundo Contactor tras Temporización T1',
    branches: [],
    seriesContacts: [
      { id: 'c_tm_5', type: 'NO', instruction: 'LD', address: 'T1.Q', tag: 'T1' }
    ],
    coils: [
      { id: 'q_tm_2', type: 'OUT', address: '%Q0.1', tag: '-H1' }
    ]
  }
];

const DEFAULT_GRAFCET_STEPS: GrafcetStep[] = [
  {
    id: 0,
    name: 'Etapa 0 (Inicial): Reposo',
    isInitial: true,
    isActive: true,
    action: '%Q0.2 := 1',
    actionDescription: 'Piloto Rojo -H2 encendido (Sistema Listo / Detenido)'
  },
  {
    id: 1,
    name: 'Etapa 1: Marcha Motor Principal',
    isInitial: false,
    isActive: false,
    action: '%Q0.0 := 1; %Q0.1 := 1',
    actionDescription: 'Activar Contactor -KM1 y Piloto Verde -H1'
  },
  {
    id: 2,
    name: 'Etapa 2: Temporización de Ciclo y Evacuación',
    isInitial: false,
    isActive: false,
    action: '%Q0.1 := 1; TON(T1, 5.0s)',
    actionDescription: 'Mantener aviso y contar 5 segundos de producción'
  }
];

const DEFAULT_GRAFCET_TRANSITIONS: GrafcetTransition[] = [
  {
    id: 0,
    fromStep: 0,
    toStep: 1,
    condition: '%I0.0 AND NOT %I0.1',
    conditionDescription: 'Pulsar Marcha (-S1) con Parada libre (-S2)'
  },
  {
    id: 1,
    fromStep: 1,
    toStep: 2,
    condition: '%I0.2 OR T1.Q',
    conditionDescription: 'Pieza detectada por sensor B1 o temporizador'
  },
  {
    id: 2,
    fromStep: 2,
    toStep: 0,
    condition: '%I0.1',
    conditionDescription: 'Pulsar Parada (-S2) o fin de ciclo automático'
  }
];

// ==========================================
// COMPONENTE PRINCIPAL MODAL
// ==========================================
interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: CircuitDocument;
  simulationState: SimulationState;
  onUpdatePlcOutputs?: (outputs: Record<string, boolean>) => void;
}

export const LadderEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  document,
  simulationState,
  onUpdatePlcOutputs
}) => {
  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'ladder' | 'grafcet' | 'io' | 'il'>('ladder');

  // Estado del Autómata (PLC)
  const [isPlcRunning, setIsPlcRunning] = useState<boolean>(true);
  const [cycleTimeMs, setCycleTimeMs] = useState<number>(2.4);
  const [scanCount, setScanCount] = useState<number>(0);

  // Programa Ladder
  const [rungs, setRungs] = useState<LadderRung[]>(PRESET_DIRECT_STARTER);

  // Mapeo I/O
  const [ioMappings, setIoMappings] = useState<IOMapping[]>(DEFAULT_IO_MAPPINGS);

  // Valores de memoria interna (%M) y salidas (%Q)
  const [memoryBits, setMemoryBits] = useState<Record<string, boolean>>({
    '%M0.0': false,
    '%M0.1': false
  });

  const [plcOutputs, setPlcOutputs] = useState<Record<string, boolean>>({
    '%Q0.0': false,
    '%Q0.1': false,
    '%Q0.2': false,
    '%Q0.3': false
  });

  // Temporizadores
  const [timerValues, setTimerValues] = useState<Record<string, { elapsed: number; pt: number; q: boolean }>>({
    T1: { elapsed: 0, pt: 4.0, q: false }
  });

  // Programa GRAFCET
  const [grafcetSteps, setGrafcetSteps] = useState<GrafcetStep[]>(DEFAULT_GRAFCET_STEPS);
  const [grafcetTransitions, setGrafcetTransitions] = useState<GrafcetTransition[]>(DEFAULT_GRAFCET_TRANSITIONS);

  // Modal para editar un contacto o bobina
  const [editingItem, setEditingItem] = useState<{
    rungId: string;
    itemId: string;
    itemType: 'contact' | 'coil' | 'timer';
    currentValue: any;
  } | null>(null);

  // Ref para sincronizar con App sin retraso
  const outputsRef = useRef(plcOutputs);
  outputsRef.current = plcOutputs;

  // 1. Lectura de Entradas Físicas desde el Esquema Eléctrico
  // %I0.0 mapeado a pulsador Marcha (-S1 / btn_start)
  // %I0.1 mapeado a pulsador Parada (-S2 / btn_stop / -S0)
  // %I0.2 mapeado a final de carrera / sensor
  const currentInputs = useMemo<Record<string, boolean>>(() => {
    const inputs: Record<string, boolean> = {};

    ioMappings.forEach(mapping => {
      if (mapping.type === 'DI') {
        if (mapping.forcedValue !== undefined) {
          inputs[mapping.address] = mapping.forcedValue;
        } else {
          // Buscar componente en el plano esquemático
          const comp = document.components.find(c => 
            c.tag === mapping.schematicTag ||
            (mapping.address === '%I0.0' && (c.id === 'btn_start' || c.tag === '-S1')) ||
            (mapping.address === '%I0.1' && (c.id === 'btn_stop' || c.tag === '-S2' || c.tag === '-S0'))
          );

          if (comp) {
            inputs[mapping.address] = comp.state?.isActuated === true;
          } else {
            inputs[mapping.address] = false;
          }
        }
      }
    });

    return inputs;
  }, [document.components, ioMappings]);

  // 2. Bucle de Ejecución del Escaneo del Autómata (Scan Cycle PLC a ~30Hz / 33ms)
  useEffect(() => {
    if (!isPlcRunning) return;

    let lastScanTime = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const deltaSec = Math.min((now - lastScanTime) / 1000, 0.1);
      lastScanTime = now;
      setCycleTimeMs(parseFloat((deltaSec * 1000).toFixed(1)));
      setScanCount(c => (c + 1) % 100000);

      // Evaluación del Programa Ladder
      setPlcOutputs(prevOutputs => {
        const nextOutputs = { ...prevOutputs };
        const nextMemory = { ...memoryBits };
        const nextTimers = { ...timerValues };

        // Función para resolver valor lógico de un contacto
        const resolveOperand = (addr: string): boolean => {
          if (addr.startsWith('%I')) {
            return !!currentInputs[addr];
          }
          if (addr.startsWith('%Q')) {
            return !!nextOutputs[addr];
          }
          if (addr.startsWith('%M')) {
            return !!nextMemory[addr];
          }
          if (addr.includes('T') && addr.includes('.Q')) {
            const tKey = addr.replace('.Q', '');
            return !!nextTimers[tKey]?.q;
          }
          return false;
        };

        // Escanear cada Rung en orden secuencial
        rungs.forEach(rung => {
          // A. Evaluar Ramas Paralelas (OR)
          let branchResult = false;
          if (rung.branches && rung.branches.length > 0) {
            for (const branch of rung.branches) {
              let branchAnd = true;
              for (const c of branch.contacts) {
                const opVal = resolveOperand(c.address);
                const contactBool = c.type === 'NO' ? opVal : !opVal;
                branchAnd = branchAnd && contactBool;
              }
              if (branchAnd) {
                branchResult = true;
                break;
              }
            }
          } else {
            branchResult = true; // Sin ramas, continuidad directa
          }

          // B. Evaluar Contactos en Serie (AND)
          let rungRlo = branchResult;
          if (rung.seriesContacts && rung.seriesContacts.length > 0) {
            for (const c of rung.seriesContacts) {
              const opVal = resolveOperand(c.address);
              const contactBool = c.type === 'NO' ? opVal : !opVal;
              rungRlo = rungRlo && contactBool;
            }
          }

          // C. Asignar Bobinas de Salida
          rung.coils.forEach(coil => {
            if (coil.type === 'OUT') {
              if (coil.address.startsWith('%Q')) {
                nextOutputs[coil.address] = rungRlo;
              } else if (coil.address.startsWith('%M')) {
                nextMemory[coil.address] = rungRlo;
              }
            } else if (coil.type === 'SET' && rungRlo) {
              if (coil.address.startsWith('%Q')) {
                nextOutputs[coil.address] = true;
              } else if (coil.address.startsWith('%M')) {
                nextMemory[coil.address] = true;
              }
            } else if (coil.type === 'RESET' && rungRlo) {
              if (coil.address.startsWith('%Q')) {
                nextOutputs[coil.address] = false;
              } else if (coil.address.startsWith('%M')) {
                nextMemory[coil.address] = false;
              }
            }
          });

          // D. Evaluar Temporizador TON
          if (rung.timer) {
            const tKey = rung.timer.name;
            const currentT = nextTimers[tKey] || { elapsed: 0, pt: rung.timer.presetSeconds, q: false };

            if (rungRlo) {
              const newElapsed = Math.min(currentT.elapsed + deltaSec, currentT.pt);
              const isDone = newElapsed >= currentT.pt;
              nextTimers[tKey] = {
                elapsed: newElapsed,
                pt: currentT.pt,
                q: isDone
              };
            } else {
              // Reset del temporizador TON cuando la condición cae a falso
              nextTimers[tKey] = {
                elapsed: 0,
                pt: currentT.pt,
                q: false
              };
            }
          }
        });

        // Actualizar temporizadores y memoria
        setTimerValues(nextTimers);
        setMemoryBits(nextMemory);

        // Propagar salidas al simulador general del circuito
        if (onUpdatePlcOutputs) {
          onUpdatePlcOutputs(nextOutputs);
        }

        return nextOutputs;
      });

      // Evaluación del Secuenciador GRAFCET
      if (activeTab === 'grafcet') {
        setGrafcetSteps(prevSteps => {
          let updatedSteps = [...prevSteps];

          grafcetTransitions.forEach(trans => {
            const fromStepObj = updatedSteps.find(s => s.id === trans.fromStep);
            if (fromStepObj && fromStepObj.isActive) {
              // Evaluar receptividad
              let isReceptivityMet = false;
              if (trans.condition === '%I0.0 AND NOT %I0.1') {
                isReceptivityMet = currentInputs['%I0.0'] && !currentInputs['%I0.1'];
              } else if (trans.condition === '%I0.2 OR T1.Q') {
                isReceptivityMet = currentInputs['%I0.2'] || timerValues['T1']?.q;
              } else if (trans.condition === '%I0.1') {
                isReceptivityMet = currentInputs['%I0.1'];
              }

              if (isReceptivityMet) {
                // Desactivar etapa anterior y activar etapa siguiente
                updatedSteps = updatedSteps.map(s => {
                  if (s.id === trans.fromStep) return { ...s, isActive: false };
                  if (s.id === trans.toStep) return { ...s, isActive: true };
                  return s;
                });
              }
            }
          });

          return updatedSteps;
        });
      }
    }, 33);

    return () => clearInterval(interval);
  }, [isPlcRunning, rungs, currentInputs, memoryBits, timerValues, grafcetTransitions, activeTab, onUpdatePlcOutputs]);

  // Carga de Plantillas Rápidas
  const handleLoadPreset = (type: 'direct' | 'sr' | 'timer') => {
    if (type === 'direct') setRungs(PRESET_DIRECT_STARTER);
    if (type === 'sr') setRungs(PRESET_SET_RESET);
    if (type === 'timer') setRungs(PRESET_TIMER_TON);
  };

  // Agregar nuevo Rung
  const handleAddRung = () => {
    const newRung: LadderRung = {
      id: `rung_${Date.now()}`,
      number: rungs.length,
      comment: `Rung ${rungs.length}: Nuevo segmento lógico`,
      branches: [],
      seriesContacts: [
        { id: `c_${Date.now()}`, type: 'NO', instruction: 'LD', address: '%I0.0', tag: '-S1' }
      ],
      coils: [
        { id: `q_${Date.now()}`, type: 'OUT', address: '%Q0.0', tag: '-KM1' }
      ]
    };
    setRungs([...rungs, newRung]);
  };

  // Eliminar Rung
  const handleDeleteRung = (rungId: string) => {
    setRungs(rungs.filter(r => r.id !== rungId).map((r, idx) => ({ ...r, number: idx })));
  };

  // Forzar entrada en la tabla I/O
  const handleToggleForceInput = (address: string) => {
    setIoMappings(prev => prev.map(m => {
      if (m.address === address) {
        const curForced = m.forcedValue;
        let nextForced: boolean | undefined = undefined;
        if (curForced === undefined) nextForced = true;
        else if (curForced === true) nextForced = false;
        else nextForced = undefined; // Retornar a automático
        return { ...m, forcedValue: nextForced };
      }
      return m;
    }));
  };

  // Pulsar botón de forma momentánea desde el modal
  const handlePulseInput = (address: string) => {
    setIoMappings(prev => prev.map(m => m.address === address ? { ...m, forcedValue: true } : m));
    setTimeout(() => {
      setIoMappings(prev => prev.map(m => m.address === address ? { ...m, forcedValue: undefined } : m));
    }, 400);
  };

  // Generador de Código IL / AWL Estándar
  const generatedIlCode = useMemo(() => {
    const lines: string[] = [
      '// ===============================================',
      '// PROGRAMA EN LISTA DE INSTRUCCIONES (IL / AWL)',
      '// Conforme a la norma internacional IEC 61131-3',
      '// Baru PLC Simulator - IEC 61131-3 Compliant',
      '// ===============================================',
      ''
    ];

    rungs.forEach(rung => {
      lines.push(`// --- ${rung.comment} ---`);
      if (rung.branches && rung.branches.length > 0) {
        rung.branches.forEach((b, bIdx) => {
          b.contacts.forEach((c, cIdx) => {
            const instr = bIdx === 0 && cIdx === 0 ? (c.type === 'NO' ? 'LD' : 'LDN') : (c.type === 'NO' ? 'OR' : 'ORN');
            lines.push(`  ${instr.padEnd(6, ' ')} ${c.address.padEnd(8, ' ')} // ${c.tag || ''}`);
          });
        });
      }
      rung.seriesContacts.forEach((c, idx) => {
        const isFirst = (!rung.branches || rung.branches.length === 0) && idx === 0;
        const instr = isFirst ? (c.type === 'NO' ? 'LD' : 'LDN') : (c.type === 'NO' ? 'AND' : 'ANDN');
        lines.push(`  ${instr.padEnd(6, ' ')} ${c.address.padEnd(8, ' ')} // ${c.tag || ''}`);
      });
      rung.coils.forEach(coil => {
        const instr = coil.type === 'OUT' ? 'ST' : coil.type === 'SET' ? 'S' : 'R';
        lines.push(`  ${instr.padEnd(6, ' ')} ${coil.address.padEnd(8, ' ')} // ${coil.tag || ''}`);
      });
      if (rung.timer) {
        lines.push(`  CAL    TON(${rung.timer.name}, IN:=RLO, PT:=T#${rung.timer.presetSeconds}s)`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }, [rungs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden text-slate-800">
        
        {/* ======================================================== */}
        {/* CABECERA INDUSTRIAL DEL MODAL PLC                       */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Binary className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wide">
                  Editor & Simulador de PLC Ladder (IEC 61131-3) & GRAFCET
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 font-bold">
                  <div className={`w-1.5 h-1.5 rounded-full ${isPlcRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                  {isPlcRunning ? 'CPU RUN' : 'CPU STOP'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-sans">
                Baru PLC Simulator • Entorno de Programación PLC • Siemens S7-1200 CPU 1214C
              </div>
            </div>
          </div>

          {/* Telemetría y Controles de CPU */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700 font-mono text-[11px] text-slate-300">
              <div>
                Scan: <span className="text-emerald-400 font-bold">{cycleTimeMs} ms</span>
              </div>
              <div className="w-px h-3 bg-slate-600" />
              <div>
                Ciclo: <span className="text-cyan-400 font-bold">{scanCount}</span>
              </div>
              <div className="w-px h-3 bg-slate-600" />
              <div>
                Entradas ON:{' '}
                <span className="text-amber-400 font-bold">
                  {Object.values(currentInputs).filter(Boolean).length}
                </span>
              </div>
              <div className="w-px h-3 bg-slate-600" />
              <div>
                Salidas ON:{' '}
                <span className="text-emerald-400 font-bold">
                  {Object.values(plcOutputs).filter(Boolean).length}
                </span>
              </div>
            </div>

            {/* Alternar RUN / STOP */}
            <button
              onClick={() => setIsPlcRunning(!isPlcRunning)}
              title={isPlcRunning ? "Poner PLC en STOP" : "Poner PLC en RUN"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                isPlcRunning 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isPlcRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlcRunning ? 'Poner STOP' : 'Poner RUN'}</span>
            </button>

            {/* Cerrar modal */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm font-bold"
              title="Cerrar Editor"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BARRA DE PESTAÑAS Y PLANTILLAS RÁPIDAS                   */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between px-5 py-2 bg-slate-100 border-b border-slate-300">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('ladder')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ladder'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>Diagrama Ladder (LD)</span>
            </button>

            <button
              onClick={() => setActiveTab('grafcet')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'grafcet'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>GRAFCET (IEC 60848)</span>
            </button>

            <button
              onClick={() => setActiveTab('io')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'io'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Mapeo I/O Físico</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            <button
              onClick={() => setActiveTab('il')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'il'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Código IL (Lista de Instrucciones)</span>
            </button>
          </div>

          {/* Plantillas Industriales */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Plantillas:</span>
            <button
              onClick={() => handleLoadPreset('direct')}
              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition-colors shadow-2xs"
            >
              Arranque Directo
            </button>
            <button
              onClick={() => handleLoadPreset('sr')}
              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition-colors shadow-2xs"
            >
              Set / Reset (S/R)
            </button>
            <button
              onClick={() => handleLoadPreset('timer')}
              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition-colors shadow-2xs"
            >
              Temporizador TON
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ÁREA DE CONTENIDO PRINCIPAL                              */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
          {/* -------------------------------------------------------- */}
          {/* TAB 1: DIAGRAMA LADDER (LD)                              */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'ladder' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Segmentos de Programación Ladder (Rungs IEC 61131-3)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Animación en tiempo real de potencia (color verde esmeralda brillante cuando la condición conduce energía).
                  </p>
                </div>
                <button
                  onClick={handleAddRung}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Segmento (Rung)</span>
                </button>
              </div>

              {/* Lista de Rungs */}
              <div className="space-y-4">
                {rungs.map(rung => {
                  // Calcular si este rung conduce energía hasta las bobinas
                  let isBranchEnergized = false;
                  if (rung.branches && rung.branches.length > 0) {
                    for (const b of rung.branches) {
                      let bConducts = true;
                      for (const c of b.contacts) {
                        const val = c.address.startsWith('%I') 
                          ? !!currentInputs[c.address]
                          : c.address.startsWith('%Q') 
                            ? !!plcOutputs[c.address] 
                            : c.address.includes('T1')
                              ? !!timerValues['T1']?.q
                              : !!memoryBits[c.address];
                        const conducts = c.type === 'NO' ? val : !val;
                        if (!conducts) { bConducts = false; break; }
                      }
                      if (bConducts) { isBranchEnergized = true; break; }
                    }
                  } else {
                    isBranchEnergized = true;
                  }

                  let isSeriesEnergized = isBranchEnergized;
                  rung.seriesContacts.forEach(c => {
                    const val = c.address.startsWith('%I') 
                      ? !!currentInputs[c.address]
                      : c.address.startsWith('%Q') 
                        ? !!plcOutputs[c.address] 
                        : c.address.includes('T1')
                          ? !!timerValues['T1']?.q
                          : !!memoryBits[c.address];
                    const conducts = c.type === 'NO' ? val : !val;
                    if (!conducts) isSeriesEnergized = false;
                  });

                  const isRungLive = isPlcRunning && isSeriesEnergized;

                  return (
                    <div 
                      key={rung.id} 
                      className={`relative bg-white rounded-xl border transition-all shadow-xs overflow-hidden ${
                        isRungLive ? 'border-emerald-500 ring-1 ring-emerald-400/50' : 'border-slate-300'
                      }`}
                    >
                      {/* Cabecera del Rung */}
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-100/80 border-b border-slate-200 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            Rung {rung.number.toString().padStart(3, '0')}
                          </span>
                          <input
                            type="text"
                            value={rung.comment}
                            onChange={e => {
                              const val = e.target.value;
                              setRungs(rungs.map(r => r.id === rung.id ? { ...r, comment: val } : r));
                            }}
                            className="bg-transparent font-medium text-slate-700 hover:bg-white px-2 py-0.5 rounded border border-transparent hover:border-slate-300 transition-colors w-96 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isRungLive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                          }`}>
                            RLO: {isRungLive ? '1 (ACTIVO)' : '0 (INACTIVO)'}
                          </span>
                          <button
                            onClick={() => handleDeleteRung(rung.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Eliminar este Rung"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Rieles y Gráfico del Rung */}
                      <div className="relative p-6 flex items-center justify-between min-h-[140px] bg-slate-900 text-slate-100 overflow-x-auto">
                        
                        {/* Riel Izquierdo de Potencia (+24V / L) */}
                        <div className="flex flex-col items-center shrink-0 mr-4">
                          <div className={`w-3 h-28 rounded-sm shadow-md transition-all ${
                            isPlcRunning ? 'bg-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-700'
                          }`} />
                          <span className="text-[10px] font-mono text-emerald-400 mt-1 font-bold">+24V</span>
                        </div>

                        {/* Contenido Central: Ramas Paralelas + Contactos en Serie */}
                        <div className="flex-1 flex items-center gap-4 px-2">
                          
                          {/* Ramas Paralelas (OR) */}
                          {rung.branches && rung.branches.length > 0 && (
                            <div className="flex items-center">
                              {/* Divisor de rama izquierda */}
                              <div className="flex flex-col items-end">
                                <div className={`w-4 h-1 ${isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                <div className={`w-1 h-20 ${isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                <div className={`w-4 h-1 ${isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                              </div>

                              {/* Filas de la rama paralela */}
                              <div className="flex flex-col gap-6 px-1">
                                {rung.branches.map(branch => {
                                  return (
                                    <div key={branch.id} className="flex items-center gap-2">
                                      {branch.contacts.map(c => {
                                        const opVal = c.address.startsWith('%I')
                                          ? !!currentInputs[c.address]
                                          : c.address.startsWith('%Q')
                                            ? !!plcOutputs[c.address]
                                            : c.address.includes('T1')
                                              ? !!timerValues['T1']?.q
                                              : !!memoryBits[c.address];
                                        const conducts = c.type === 'NO' ? opVal : !opVal;

                                        return (
                                          <div key={c.id} className="flex items-center group relative">
                                            {/* Cable antes */}
                                            <div className={`w-5 h-1 ${isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                            
                                            {/* Símbolo de Contacto */}
                                            <div 
                                              onClick={() => {
                                                // Alternar entre NO y NC al hacer clic
                                                setRungs(rungs.map(r => {
                                                  if (r.id !== rung.id) return r;
                                                  return {
                                                    ...r,
                                                    branches: r.branches.map(b => ({
                                                      ...b,
                                                      contacts: b.contacts.map(item => item.id === c.id ? { ...item, type: item.type === 'NO' ? 'NC' : 'NO' } : item)
                                                    }))
                                                  };
                                                }));
                                              }}
                                              className={`cursor-pointer px-3 py-2 rounded-lg border flex flex-col items-center transition-all ${
                                                conducts && isPlcRunning 
                                                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' 
                                                  : 'bg-slate-800/90 border-slate-600 text-slate-300 hover:border-slate-400'
                                              }`}
                                              title="Clic para cambiar entre contacto NA y NC"
                                            >
                                              <span className="text-[10px] font-mono font-bold text-amber-400">
                                                {c.address}
                                              </span>
                                              <span className="text-[12px] font-mono font-black py-0.5 tracking-widest">
                                                {c.type === 'NO' ? '—[ ]—' : '—[/]—'}
                                              </span>
                                              <span className="text-[9px] font-sans text-slate-400">
                                                {c.tag || 'Contacto'}
                                              </span>
                                            </div>

                                            {/* Cable después */}
                                            <div className={`w-5 h-1 ${conducts && isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Conector de unión derecha */}
                              <div className="flex flex-col items-start">
                                <div className={`w-4 h-1 ${isBranchEnergized && isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                <div className={`w-1 h-20 ${isBranchEnergized && isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                <div className={`w-4 h-1 ${isBranchEnergized && isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                              </div>
                            </div>
                          )}

                          {/* Contactos en Serie (AND / ANDN) */}
                          <div className="flex items-center gap-2">
                            {rung.seriesContacts.map(c => {
                              const opVal = c.address.startsWith('%I')
                                ? !!currentInputs[c.address]
                                : c.address.startsWith('%Q')
                                  ? !!plcOutputs[c.address]
                                  : c.address.includes('T1')
                                    ? !!timerValues['T1']?.q
                                    : !!memoryBits[c.address];
                              const conducts = c.type === 'NO' ? opVal : !opVal;

                              return (
                                <div key={c.id} className="flex items-center">
                                  {/* Cable antes */}
                                  <div className={`w-5 h-1 ${isBranchEnergized && isPlcRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />

                                  {/* Símbolo de Contacto Serie */}
                                  <div 
                                    onClick={() => {
                                      // Alternar NA / NC al clic
                                      setRungs(rungs.map(r => {
                                        if (r.id !== rung.id) return r;
                                        return {
                                          ...r,
                                          seriesContacts: r.seriesContacts.map(item => item.id === c.id ? { ...item, type: item.type === 'NO' ? 'NC' : 'NO' } : item)
                                        };
                                      }));
                                    }}
                                    className={`cursor-pointer px-3 py-2 rounded-lg border flex flex-col items-center transition-all ${
                                      conducts && isBranchEnergized && isPlcRunning
                                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                        : 'bg-slate-800/90 border-slate-600 text-slate-300 hover:border-slate-400'
                                    }`}
                                    title="Clic para cambiar entre contacto NA y NC"
                                  >
                                    <span className="text-[10px] font-mono font-bold text-amber-400">
                                      {c.address}
                                    </span>
                                    <span className="text-[12px] font-mono font-black py-0.5 tracking-widest">
                                      {c.type === 'NO' ? '—[ ]—' : '—[/]—'}
                                    </span>
                                    <span className="text-[9px] font-sans text-slate-400">
                                      {c.tag || 'Contacto'}
                                    </span>
                                  </div>

                                  {/* Cable después */}
                                  <div className={`w-5 h-1 ${isRungLive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                </div>
                              );
                            })}
                          </div>

                          {/* Línea de conducción hasta las bobinas */}
                          <div className={`flex-1 h-1 transition-all ${isRungLive ? 'bg-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-slate-600'}`} />

                          {/* Bobinas de Salida (OUT, SET, RESET) */}
                          <div className="flex items-center gap-3">
                            {rung.coils.map(coil => {
                              const isCoilActive = coil.address.startsWith('%Q') 
                                ? !!plcOutputs[coil.address] 
                                : !!memoryBits[coil.address];

                              return (
                                <div key={coil.id} className="flex items-center">
                                  <div 
                                    onClick={() => {
                                      // Alternar tipo de bobina: OUT -> SET -> RESET -> OUT
                                      setRungs(rungs.map(r => {
                                        if (r.id !== rung.id) return r;
                                        return {
                                          ...r,
                                          coils: r.coils.map(q => {
                                            if (q.id !== coil.id) return q;
                                            const nextType: CoilType = q.type === 'OUT' ? 'SET' : q.type === 'SET' ? 'RESET' : 'OUT';
                                            return { ...q, type: nextType };
                                          })
                                        };
                                      }));
                                    }}
                                    className={`cursor-pointer px-3.5 py-2 rounded-lg border flex flex-col items-center transition-all ${
                                      isCoilActive && isPlcRunning
                                        ? 'bg-emerald-900 border-emerald-400 text-emerald-200 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse'
                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
                                    }`}
                                    title="Clic para cambiar tipo de bobina (OUT, SET, RESET)"
                                  >
                                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                                      {coil.address}
                                    </span>
                                    <span className="text-[13px] font-mono font-black py-0.5 tracking-wider">
                                      {coil.type === 'OUT' ? '—( )—' : coil.type === 'SET' ? '—(S)—' : '—(R)—'}
                                    </span>
                                    <span className="text-[9px] font-sans text-slate-300 font-semibold">
                                      {coil.tag || 'Salida'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Bloque Temporizador TON si existe */}
                          {rung.timer && (
                            <div className="flex items-center">
                              <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 w-48 text-xs font-mono shadow-md">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                                  <span className="text-amber-400 font-bold">TON [{rung.timer.name}]</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                    timerValues[rung.timer.name]?.q ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-300'
                                  }`}>
                                    Q: {timerValues[rung.timer.name]?.q ? '1' : '0'}
                                  </span>
                                </div>
                                <div className="py-2 space-y-1 text-[11px]">
                                  <div className="flex justify-between text-slate-300">
                                    <span>IN:</span>
                                    <span className={isRungLive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                      {isRungLive ? 'TRUE' : 'FALSE'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>PT (Preset):</span>
                                    <span className="text-cyan-400 font-bold">{rung.timer.presetSeconds.toFixed(1)} s</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>ET (Elapsed):</span>
                                    <span className="text-amber-400 font-bold">
                                      {(timerValues[rung.timer.name]?.elapsed || 0).toFixed(1)} s
                                    </span>
                                  </div>
                                </div>
                                {/* Barra de Progreso del Temporizador */}
                                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-emerald-400 h-full transition-all duration-75"
                                    style={{
                                      width: `${Math.min(100, ((timerValues[rung.timer.name]?.elapsed || 0) / rung.timer.presetSeconds) * 100)}%`
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Cable final a riel neutro */}
                          <div className={`w-6 h-1 ${isRungLive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        </div>

                        {/* Riel Derecho de Referencia (0V / M / N) */}
                        <div className="flex flex-col items-center shrink-0 ml-4">
                          <div className="w-3 h-28 bg-slate-600 rounded-sm shadow-md" />
                          <span className="text-[10px] font-mono text-slate-400 mt-1 font-bold">0V (M)</span>
                        </div>
                      </div>

                      {/* Barra de Acciones Rápidas del Rung */}
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="text-[11px] font-medium text-slate-500">Insertar en Rung:</span>
                          <button
                            onClick={() => {
                              const newContact: LadderContact = {
                                id: `c_${Date.now()}`,
                                type: 'NO',
                                instruction: 'AND',
                                address: '%I0.2',
                                tag: '-S3'
                              };
                              setRungs(rungs.map(r => r.id === rung.id ? { ...r, seriesContacts: [...r.seriesContacts, newContact] } : r));
                            }}
                            className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-semibold"
                          >
                            + Contacto NA
                          </button>
                          <button
                            onClick={() => {
                              const newContact: LadderContact = {
                                id: `c_${Date.now()}`,
                                type: 'NC',
                                instruction: 'ANDN',
                                address: '%I0.1',
                                tag: '-S2'
                              };
                              setRungs(rungs.map(r => r.id === rung.id ? { ...r, seriesContacts: [...r.seriesContacts, newContact] } : r));
                            }}
                            className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-semibold"
                          >
                            + Contacto NC
                          </button>
                          <button
                            onClick={() => {
                              const newCoil: LadderCoil = {
                                id: `q_${Date.now()}`,
                                type: 'OUT',
                                address: '%Q0.1',
                                tag: '-H1'
                              };
                              setRungs(rungs.map(r => r.id === rung.id ? { ...r, coils: [...r.coils, newCoil] } : r));
                            }}
                            className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-semibold"
                          >
                            + Bobina Salida
                          </button>
                          <button
                            onClick={() => {
                              const newTimer: LadderTimer = {
                                id: `timer_${Date.now()}`,
                                name: 'T1',
                                presetSeconds: 3.0,
                                elapsedSeconds: 0,
                                isDone: false,
                                isActive: false
                              };
                              setRungs(rungs.map(r => r.id === rung.id ? { ...r, timer: newTimer } : r));
                            }}
                            className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-semibold text-indigo-700"
                          >
                            + Temporizador TON
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          IEC 61131-3 LD • Haz clic sobre cualquier contacto o bobina para conmutar su tipo
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 2: GRAFCET (IEC 60848)                               */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'grafcet' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Diagrama Funcional Secuencial GRAFCET (SFC - IEC 60848)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evolución de etapas y transiciones sincronizadas con los pulsadores y temporizadores del PLC.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Etapa Activa:</span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold text-xs border border-emerald-300">
                    {grafcetSteps.find(s => s.isActive)?.name || 'Ninguna'}
                  </span>
                </div>
              </div>

              {/* Vista Visual del Diagrama GRAFCET */}
              <div className="bg-white rounded-xl border border-slate-300 p-6 flex flex-col items-center space-y-6">
                {grafcetSteps.map((step, idx) => {
                  const transition = grafcetTransitions.find(t => t.fromStep === step.id);
                  const isTransitionEnabled = step.isActive;

                  return (
                    <React.Fragment key={step.id}>
                      {/* Bloque de Etapa */}
                      <div className="flex items-center gap-4 w-full max-w-xl">
                        {/* Cuadro de la Etapa */}
                        <div className={`relative flex items-center justify-center w-16 h-16 rounded-lg font-mono font-black text-base shadow-sm transition-all ${
                          step.isInitial ? 'border-4 border-double' : 'border-2'
                        } ${
                          step.isActive
                            ? 'bg-emerald-500 text-white border-emerald-600 ring-4 ring-emerald-300/60 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                            : 'bg-slate-100 text-slate-700 border-slate-400'
                        }`}>
                          <span>X{step.id}</span>
                          {step.isActive && (
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border-2 border-emerald-600 animate-ping" />
                          )}
                        </div>

                        {/* Descripción y Acción Asociada a la Etapa */}
                        <div className="flex-1 p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{step.name}</span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              step.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {step.isActive ? 'ACTIVA (1)' : 'REPOSO (0)'}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {step.action}
                            </span>
                            <span className="text-slate-600 text-[11px]">{step.actionDescription}</span>
                          </div>
                        </div>
                      </div>

                      {/* Transición hacia la siguiente etapa */}
                      {transition && (
                        <div className="flex flex-col items-center my-1 relative">
                          {/* Línea vertical de flujo */}
                          <div className={`w-0.5 h-6 ${isTransitionEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />

                          {/* Barra horizontal de receptividad de transición */}
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-1 rounded-full ${isTransitionEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                              isTransitionEnabled
                                ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                            }`}>
                              {transition.condition}
                              <span className="block text-[9px] font-sans font-normal text-slate-500">
                                {transition.conditionDescription}
                              </span>
                            </div>
                          </div>

                          <div className={`w-0.5 h-6 ${isTransitionEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Bucle de Retorno GRAFCET */}
                <div className="text-xs text-slate-500 flex items-center gap-1 font-mono pt-2">
                  <span>↺ Retorno en bucle cerrado a Etapa Inicial X0 al completar el ciclo</span>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 3: TABLA DE MAPEO I/O FÍSICO (REQUISITO 2)           */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'io' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Tabla de Mapeo de Entradas y Salidas Físicas con el Esquema Eléctrico
                </h3>
                <p className="text-xs text-slate-500">
                  Correspondencia biunívoca entre variables del autómata (%I, %Q) y los componentes de maniobra y potencia del plano (-S1, -S2, -KM1, -H1).
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="py-2.5 px-4">Dirección IEC</th>
                      <th className="py-2.5 px-4">Tipo</th>
                      <th className="py-2.5 px-4">Componente Esquema</th>
                      <th className="py-2.5 px-4">Nombre / Función</th>
                      <th className="py-2.5 px-4">Estado Lógico</th>
                      <th className="py-2.5 px-4">Tensión Borna</th>
                      <th className="py-2.5 px-4 text-center">Acción / Forzado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ioMappings.map(mapping => {
                      const isInput = mapping.type === 'DI';
                      const isOutput = mapping.type === 'DQ';
                      const isMemory = mapping.type === 'M';

                      const currentValue = isInput
                        ? !!currentInputs[mapping.address]
                        : isOutput
                          ? !!plcOutputs[mapping.address]
                          : !!memoryBits[mapping.address];

                      const voltage = currentValue ? '+24.0 V DC' : '0.0 V DC';

                      return (
                        <tr key={mapping.address} className="hover:bg-slate-50 transition-colors">
                          {/* Dirección */}
                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                            {mapping.address}
                          </td>

                          {/* Tipo */}
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isInput ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              isOutput ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              'bg-purple-100 text-purple-800 border border-purple-300'
                            }`}>
                              {isInput ? 'Entrada DI' : isOutput ? 'Salida Relé DQ' : 'Marca M'}
                            </span>
                          </td>

                          {/* Tag Esquemático */}
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                            {mapping.schematicTag}
                          </td>

                          {/* Nombre */}
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-800">{mapping.name}</div>
                            <div className="text-[10px] text-slate-500">{mapping.description}</div>
                          </td>

                          {/* Estado Lógico */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full transition-all ${
                                currentValue 
                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse' 
                                  : 'bg-slate-300'
                              }`} />
                              <span className={`font-mono font-bold ${currentValue ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {currentValue ? 'TRUE (1)' : 'FALSE (0)'}
                              </span>
                            </div>
                          </td>

                          {/* Tensión */}
                          <td className="py-2.5 px-4 font-mono text-slate-600">
                            {voltage}
                          </td>

                          {/* Acción / Forzado */}
                          <td className="py-2.5 px-4 text-center">
                            {isInput ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handlePulseInput(mapping.address)}
                                  title="Pulsar momentáneamente esta entrada (simula pulsar botón físico)"
                                  className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 text-[10px] font-bold transition-all shadow-2xs"
                                >
                                  Pulsar
                                </button>
                                <button
                                  onClick={() => handleToggleForceInput(mapping.address)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                    mapping.forcedValue !== undefined
                                      ? 'bg-amber-500 text-white border-amber-600'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                  }`}
                                  title="Forzar valor de entrada permanente"
                                >
                                  {mapping.forcedValue === undefined ? 'Auto' : mapping.forcedValue ? 'Forzado [1]' : 'Forzado [0]'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Controlado por Ladder
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 4: CÓDIGO IL / AWL (INSTRUCTION LIST)                 */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'il' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Lista de Instrucciones IEC 61131-3 (IL / AWL)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Traducción directa y recíproca del diagrama de contactos a lenguaje textual estándar industrial.
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedIlCode);
                    alert('¡Código IL copiado al portapapeles!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </button>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 font-mono text-xs text-emerald-400 shadow-inner overflow-x-auto">
                <pre>{generatedIlCode}</pre>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* PIE DE PÁGINA Y ESTADO DEL ENTORNO                       */}
        {/* ======================================================== */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Estado de Enlace:</span>
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Sincronizado con Esquema Eléctrico y Planta 2D
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Resetear estado del autómata
                setPlcOutputs({ '%Q0.0': false, '%Q0.1': false, '%Q0.2': false, '%Q0.3': false });
                setMemoryBits({ '%M0.0': false, '%M0.1': false });
                setTimerValues({ T1: { elapsed: 0, pt: 4.0, q: false } });
                setGrafcetSteps(DEFAULT_GRAFCET_STEPS);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar Memoria PLC</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs"
            >
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
