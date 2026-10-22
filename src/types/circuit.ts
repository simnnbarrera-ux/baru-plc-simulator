export type WireType = 
  | 'phase'       // Fase genérica (Gris/Marrón)
  | 'phase1'      // Fase L1 (Marrón)
  | 'phase2'      // Fase L2 (Negro)
  | 'phase3'      // Fase L3 (Gris)
  | 'neutral'     // Neutro (Azul)
  | 'pe'          // Tierra / Protección PE (Verde-Amarillo)
  | 'dc_pos'      // Positivo DC (Rojo)
  | 'dc_neg'      // Negativo DC (Azul marino / Negro)
  | 'control';    // Cable de control (Rojo / Negro fino)

export type PinType = 'input' | 'output' | 'passive' | 'power_in' | 'power_out' | 'coil';

export interface ComponentPin {
  id: string;               // e.g. "1", "2", "13", "14", "A1", "A2", "L1", "N"
  label: string;            // Número o texto que se imprime junto al terminal
  relX: number;             // Coordenada relativa en grid units (1 unidad = 20px)
  relY: number;
  type: PinType;
  defaultPotential?: string;// Ej: "L1", "N", "PE", "24V", "0V"
}

export type ComponentCategory = 
  | 'power'          // Alimentaciones (L1, L2, L3, N, PE, +, -)
  | 'protection'     // Fusibles, Seccionadores, Guardamotores, Relé térmico
  | 'switches'       // Interruptores, Disyuntores automáticos
  | 'contactors'     // Contactores de potencia y auxiliares
  | 'motors'         // Motores trifásicos, monofásicos, paso a paso
  | 'actuators'      // Cilindros neumáticos, electroválvulas
  | 'control'        // Pulsadores NA, NC, paradas de emergencia (seta)
  | 'relays'         // Bobinas, Relés auxiliares, Temporizadores TON/TOF
  | 'signaling'      // Luces piloto, Sirenas, Indicadores
  | 'wires'          // Trazado de cables y conexiones
  | 'grafcet'        // Etapas, transiciones, acciones GRAFCET
  | 'plc';           // Módulos CPU PLC (S7-1200, LOGO!)

export interface ComponentDefinition {
  type: string;             // Identificador único (ej: "motor_3phase", "coil_contactor", "button_no")
  name: string;             // Nombre visible en español (ej: "Motor trifásico")
  category: ComponentCategory;
  width: number;            // Ancho en grid units
  height: number;           // Alto en grid units
  pins: ComponentPin[];
  defaultTag: string;       // Prefijo por defecto (ej: "-M", "-KM", "-S", "-Q", "-H")
  description: string;
  hasTimer?: boolean;       // Si posee configuración de tiempo (ej. temporizadores TON/TOF)
  defaultTimeSeconds?: number;
  isNormallyClosed?: boolean; // Para contactos y pulsadores NC
}

export interface PlacedComponent {
  id: string;               // UUID único
  type: string;             // Referencia a ComponentDefinition.type
  tag: string;              // Identificador de esquema (ej: "-KM1", "-S1", "-Q1")
  x: number;                // Posición en grid units
  y: number;
  rotation: 0 | 90 | 180 | 270;
  mirrored?: boolean;
  value?: string;           // Parámetros adicionales (ej: tiempo "5s", potencia "2.2kW")
  timerValue?: number;      // Tiempo en segundos para temporizadores
  state?: {
    isOpen?: boolean;       // Estado del contacto (abierto o cerrado)
    isEnergized?: boolean;  // Si la bobina o componente tiene tensión
    isActuated?: boolean;   // Si un pulsador está siendo presionado físicamente
    timerProgress?: number; // 0.0 a 1.0 (para temporizadores)
    motorRpm?: number;      // RPM actuales del motor
    motorRotation?: number; // Sentido: 1 (horario), -1 (antihorario), 0 (detenido)
    angle?: number;         // Ángulo de animación del rotor en grados (0..360)
  };
}

export interface WireSegment {
  id: string;
  fromX: number;            // Coordenadas absolutas en grid units
  fromY: number;
  toX: number;
  toY: number;
  wireType: WireType;
  isEnergized?: boolean;
  potential?: string;       // "L1", "L2", "L3", "N", "PE", "24V", "0V"
}

export interface JunctionNode {
  id: string;
  x: number;
  y: number;
  isEnergized?: boolean;
  potential?: string;
}

export interface TitleBlockData {
  title: string;
  project: string;
  author: string;
  date: string;
  sheet: string;
  scale: string;
  revision: string;
  company: string;
}

export interface CircuitDocument {
  version: string;
  components: PlacedComponent[];
  wires: WireSegment[];
  junctions: JunctionNode[];
  titleBlock: TitleBlockData;
  gridSize: number; // Por defecto 20 píxeles por unidad
}
