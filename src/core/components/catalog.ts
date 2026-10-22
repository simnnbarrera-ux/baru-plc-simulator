import { ComponentDefinition } from '../../types/circuit';

export const COMPONENT_CATALOG: ComponentDefinition[] = [
  // ==========================================
  // ALIMENTACIONES (POWER)
  // ==========================================
  {
    type: 'power_l',
    name: 'Alimentación L (Fase)',
    category: 'power',
    width: 2,
    height: 2,
    defaultTag: 'L',
    description: 'Fuente de fase de corriente alterna (230V)',
    pins: [
      { id: 'L', label: 'L', relX: 1, relY: 2, type: 'power_out', defaultPotential: 'L1' }
    ]
  },
  {
    type: 'power_n',
    name: 'Alimentación N (Neutro)',
    category: 'power',
    width: 2,
    height: 2,
    defaultTag: 'N',
    description: 'Conductor neutro de referencia (0V)',
    pins: [
      { id: 'N', label: 'N', relX: 1, relY: 2, type: 'power_out', defaultPotential: 'N' }
    ]
  },
  {
    type: 'power_pe',
    name: 'Alimentación PE (Tierra)',
    category: 'power',
    width: 2,
    height: 2,
    defaultTag: 'PE',
    description: 'Conductor de protección y puesta a tierra',
    pins: [
      { id: 'PE', label: 'PE', relX: 1, relY: 2, type: 'power_out', defaultPotential: 'PE' }
    ]
  },
  {
    type: 'power_ln',
    name: 'Alimentación L + N (Monofásica)',
    category: 'power',
    width: 3,
    height: 2,
    defaultTag: 'L-N',
    description: 'Línea de alimentación monofásica Fase y Neutro',
    pins: [
      { id: 'L', label: 'L', relX: 1, relY: 2, type: 'power_out', defaultPotential: 'L1' },
      { id: 'N', label: 'N', relX: 2, relY: 2, type: 'power_out', defaultPotential: 'N' }
    ]
  },
  {
    type: 'power_3phase',
    name: 'Alimentación L1 L2 L3 (Trifásica)',
    category: 'power',
    width: 4,
    height: 2,
    defaultTag: '3L',
    description: 'Suministro trifásico de potencia (400V entre fases)',
    pins: [
      { id: 'L1', label: 'L1', relX: 1, relY: 2, type: 'power_out', defaultPotential: 'L1' },
      { id: 'L2', label: 'L2', relX: 2, relY: 2, type: 'power_out', defaultPotential: 'L2' },
      { id: 'L3', label: 'L3', relX: 3, relY: 2, type: 'power_out', defaultPotential: 'L3' }
    ]
  },
  {
    type: 'power_3phase_pe',
    name: 'Alimentación 3L + PE',
    category: 'power',
    width: 5,
    height: 2,
    defaultTag: '3L+PE',
    description: 'Alimentación trifásica con conductor de protección',
    pins: [
      { id: 'L1', label: 'L1', relX: 1, relY: 2, type: 'power_out', defaultPotential: 'L1' },
      { id: 'L2', label: 'L2', relX: 2, relY: 2, type: 'power_out', defaultPotential: 'L2' },
      { id: 'L3', label: 'L3', relX: 3, relY: 2, type: 'power_out', defaultPotential: 'L3' },
      { id: 'PE', label: 'PE', relX: 4, relY: 2, type: 'power_out', defaultPotential: 'PE' }
    ]
  },
  {
    type: 'power_dc',
    name: 'Fuente DC + / - (24V)',
    category: 'power',
    width: 3,
    height: 2,
    defaultTag: 'DC',
    description: 'Fuente de corriente continua para maniobra y electrónica',
    pins: [
      { id: 'POS', label: '+', relX: 1, relY: 2, type: 'power_out', defaultPotential: '+24V' },
      { id: 'NEG', label: '-', relX: 2, relY: 2, type: 'power_out', defaultPotential: '0V' }
    ]
  },

  // ==========================================
  // PROTECCIONES & DISYUNTORES (PROTECTION)
  // ==========================================
  {
    type: 'breaker_3p',
    name: 'Disyuntor Guardamotor 3P',
    category: 'protection',
    width: 4,
    height: 4,
    defaultTag: '-Q',
    description: 'Disyuntor magnetotérmico para protección de motor trifásico',
    pins: [
      { id: '1', label: '1', relX: 1, relY: 0, type: 'power_in' },
      { id: '2', label: '2', relX: 1, relY: 4, type: 'power_out' },
      { id: '3', label: '3', relX: 2, relY: 0, type: 'power_in' },
      { id: '4', label: '4', relX: 2, relY: 4, type: 'power_out' },
      { id: '5', label: '5', relX: 3, relY: 0, type: 'power_in' },
      { id: '6', label: '6', relX: 3, relY: 4, type: 'power_out' }
    ]
  },
  {
    type: 'breaker_1p_n',
    name: 'Disyuntor 1P + N (Control)',
    category: 'protection',
    width: 3,
    height: 4,
    defaultTag: '-Q',
    description: 'Interruptor automático magnetotérmico para circuito de mando',
    pins: [
      { id: '1', label: '1', relX: 1, relY: 0, type: 'power_in' },
      { id: '2', label: '2', relX: 1, relY: 4, type: 'power_out' },
      { id: 'N1', label: 'N', relX: 2, relY: 0, type: 'power_in' },
      { id: 'N2', label: 'N', relX: 2, relY: 4, type: 'power_out' }
    ]
  },
  {
    type: 'thermal_relay_power',
    name: 'Relé Térmico Potencia 3P',
    category: 'protection',
    width: 4,
    height: 4,
    defaultTag: '-F',
    description: 'Bimetales térmicos en serie con las fases del motor',
    pins: [
      { id: '1', label: '1', relX: 1, relY: 0, type: 'power_in' },
      { id: '2', label: '2', relX: 1, relY: 4, type: 'power_out' },
      { id: '3', label: '3', relX: 2, relY: 0, type: 'power_in' },
      { id: '4', label: '4', relX: 2, relY: 4, type: 'power_out' },
      { id: '5', label: '5', relX: 3, relY: 0, type: 'power_in' },
      { id: '6', label: '6', relX: 3, relY: 4, type: 'power_out' }
    ]
  },
  {
    type: 'thermal_contact_nc',
    name: 'Contacto Relé Térmico NC (95-96)',
    category: 'protection',
    width: 2,
    height: 3,
    defaultTag: '-F',
    description: 'Contacto de seguridad para cortar la maniobra ante sobrecarga',
    isNormallyClosed: true,
    pins: [
      { id: '95', label: '95', relX: 1, relY: 0, type: 'passive' },
      { id: '96', label: '96', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'thermal_contact_no',
    name: 'Contacto Relé Térmico NA (97-98)',
    category: 'protection',
    width: 2,
    height: 3,
    defaultTag: '-F',
    description: 'Contacto para señalización de disparo térmico',
    isNormallyClosed: false,
    pins: [
      { id: '97', label: '97', relX: 1, relY: 0, type: 'passive' },
      { id: '98', label: '98', relX: 1, relY: 3, type: 'passive' }
    ]
  },

  // ==========================================
  // CONTACTORES (CONTACTORS)
  // ==========================================
  {
    type: 'contactor_power_3p',
    name: 'Contactor Principal 3P',
    category: 'contactors',
    width: 4,
    height: 4,
    defaultTag: '-KM',
    description: 'Contactos principales tripolares gobernados por la bobina -KM',
    pins: [
      { id: '1', label: '1', relX: 1, relY: 0, type: 'power_in' },
      { id: '2', label: '2', relX: 1, relY: 4, type: 'power_out' },
      { id: '3', label: '3', relX: 2, relY: 0, type: 'power_in' },
      { id: '4', label: '4', relX: 2, relY: 4, type: 'power_out' },
      { id: '5', label: '5', relX: 3, relY: 0, type: 'power_in' },
      { id: '6', label: '6', relX: 3, relY: 4, type: 'power_out' }
    ]
  },
  {
    type: 'contact_no',
    name: 'Contacto Auxiliar NA (13-14)',
    category: 'contactors',
    width: 2,
    height: 3,
    defaultTag: '-KM',
    description: 'Contacto normalmente abierto para autoenclavamiento o señalización',
    isNormallyClosed: false,
    pins: [
      { id: '13', label: '13', relX: 1, relY: 0, type: 'passive' },
      { id: '14', label: '14', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'contact_nc',
    name: 'Contacto Auxiliar NC (21-22)',
    category: 'contactors',
    width: 2,
    height: 3,
    defaultTag: '-KM',
    description: 'Contacto normalmente cerrado para enclavamiento eléctrico mutuo',
    isNormallyClosed: true,
    pins: [
      { id: '21', label: '21', relX: 1, relY: 0, type: 'passive' },
      { id: '22', label: '22', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'contact_timer_ton_no',
    name: 'Contacto Temporizado TON NA (67-68)',
    category: 'contactors',
    width: 2,
    height: 3,
    defaultTag: '-KT',
    description: 'Contacto temporizado a la conexión normalmente abierto',
    isNormallyClosed: false,
    pins: [
      { id: '67', label: '67', relX: 1, relY: 0, type: 'passive' },
      { id: '68', label: '68', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'contact_timer_ton_nc',
    name: 'Contacto Temporizado TON NC (55-56)',
    category: 'contactors',
    width: 2,
    height: 3,
    defaultTag: '-KT',
    description: 'Contacto temporizado a la conexión normalmente cerrado',
    isNormallyClosed: true,
    pins: [
      { id: '55', label: '55', relX: 1, relY: 0, type: 'passive' },
      { id: '56', label: '56', relX: 1, relY: 3, type: 'passive' }
    ]
  },

  // ==========================================
  // MANDOS Y PULSADORES (CONTROL)
  // ==========================================
  {
    type: 'button_no',
    name: 'Pulsador de Marcha NA (3-4)',
    category: 'control',
    width: 2,
    height: 3,
    defaultTag: '-S',
    description: 'Pulsador normalmente abierto para arranque (Start / Marcha)',
    isNormallyClosed: false,
    pins: [
      { id: '3', label: '3', relX: 1, relY: 0, type: 'passive' },
      { id: '4', label: '4', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'button_nc',
    name: 'Pulsador de Parada NC (1-2)',
    category: 'control',
    width: 2,
    height: 3,
    defaultTag: '-S',
    description: 'Pulsador normalmente cerrado para parada (Stop / Paro)',
    isNormallyClosed: true,
    pins: [
      { id: '1', label: '1', relX: 1, relY: 0, type: 'passive' },
      { id: '2', label: '2', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'emergency_stop',
    name: 'Parada de Emergencia (Seta NC)',
    category: 'control',
    width: 2,
    height: 3,
    defaultTag: '-S',
    description: 'Seta de emergencia con enclavamiento mecánico',
    isNormallyClosed: true,
    pins: [
      { id: '1', label: '1', relX: 1, relY: 0, type: 'passive' },
      { id: '2', label: '2', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'limit_switch_no',
    name: 'Final de Carrera NA',
    category: 'control',
    width: 2,
    height: 3,
    defaultTag: '-FC',
    description: 'Interruptor de posición de fin de carrera NA',
    isNormallyClosed: false,
    pins: [
      { id: '13', label: '13', relX: 1, relY: 0, type: 'passive' },
      { id: '14', label: '14', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'limit_switch_nc',
    name: 'Final de Carrera NC',
    category: 'control',
    width: 2,
    height: 3,
    defaultTag: '-FC',
    description: 'Interruptor de posición de fin de carrera NC',
    isNormallyClosed: true,
    pins: [
      { id: '21', label: '21', relX: 1, relY: 0, type: 'passive' },
      { id: '22', label: '22', relX: 1, relY: 3, type: 'passive' }
    ]
  },

  // ==========================================
  // BOBINAS Y RELÉS (RELAYS)
  // ==========================================
  {
    type: 'coil_contactor',
    name: 'Bobina de Contactor',
    category: 'relays',
    width: 2,
    height: 3,
    defaultTag: '-KM',
    description: 'Bobina electromagnética de contactor (A1-A2)',
    pins: [
      { id: 'A1', label: 'A1', relX: 1, relY: 0, type: 'coil' },
      { id: 'A2', label: 'A2', relX: 1, relY: 3, type: 'coil' }
    ]
  },
  {
    type: 'coil_timer_ton',
    name: 'Bobina Temporizador TON (Retardo Conexión)',
    category: 'relays',
    width: 2,
    height: 3,
    defaultTag: '-KT',
    description: 'Temporizador electrónico a la conexión',
    hasTimer: true,
    defaultTimeSeconds: 5,
    pins: [
      { id: 'A1', label: 'A1', relX: 1, relY: 0, type: 'coil' },
      { id: 'A2', label: 'A2', relX: 1, relY: 3, type: 'coil' }
    ]
  },
  {
    type: 'coil_timer_tof',
    name: 'Bobina Temporizador TOF (Retardo Desconexión)',
    category: 'relays',
    width: 2,
    height: 3,
    defaultTag: '-KT',
    description: 'Temporizador electrónico a la desconexión',
    hasTimer: true,
    defaultTimeSeconds: 5,
    pins: [
      { id: 'A1', label: 'A1', relX: 1, relY: 0, type: 'coil' },
      { id: 'A2', label: 'A2', relX: 1, relY: 3, type: 'coil' }
    ]
  },

  // ==========================================
  // MOTORES (MOTORS)
  // ==========================================
  {
    type: 'motor_3phase',
    name: 'Motor Trifásico Asíncrono',
    category: 'motors',
    width: 4,
    height: 4,
    defaultTag: '-M',
    description: 'Motor trifásico jaula de ardilla (U1, V1, W1 + PE)',
    pins: [
      { id: 'U1', label: 'U1', relX: 1, relY: 0, type: 'power_in' },
      { id: 'V1', label: 'V1', relX: 2, relY: 0, type: 'power_in' },
      { id: 'W1', label: 'W1', relX: 3, relY: 0, type: 'power_in' },
      { id: 'PE', label: 'PE', relX: 4, relY: 2, type: 'power_in' }
    ]
  },
  {
    type: 'motor_3phase_6p',
    name: 'Motor Trifásico 6 Bornes (Y-Δ)',
    category: 'motors',
    width: 4,
    height: 5,
    defaultTag: '-M',
    description: 'Motor trifásico para arranque estrella-triángulo (U1-V1-W1 / U2-V2-W2)',
    pins: [
      { id: 'U1', label: 'U1', relX: 1, relY: 0, type: 'power_in' },
      { id: 'V1', label: 'V1', relX: 2, relY: 0, type: 'power_in' },
      { id: 'W1', label: 'W1', relX: 3, relY: 0, type: 'power_in' },
      { id: 'W2', label: 'W2', relX: 1, relY: 5, type: 'power_out' },
      { id: 'U2', label: 'U2', relX: 2, relY: 5, type: 'power_out' },
      { id: 'V2', label: 'V2', relX: 3, relY: 5, type: 'power_out' },
      { id: 'PE', label: 'PE', relX: 4, relY: 2, type: 'power_in' }
    ]
  },
  {
    type: 'motor_1phase',
    name: 'Motor Monofásico',
    category: 'motors',
    width: 3,
    height: 4,
    defaultTag: '-M',
    description: 'Motor monofásico con condensador y devanado auxiliar',
    pins: [
      { id: 'U1', label: 'U1', relX: 1, relY: 0, type: 'power_in' },
      { id: 'U2', label: 'U2', relX: 2, relY: 0, type: 'power_in' },
      { id: 'PE', label: 'PE', relX: 3, relY: 2, type: 'power_in' }
    ]
  },

  // ==========================================
  // SEÑALIZACIÓN (SIGNALING)
  // ==========================================
  {
    type: 'pilot_light_green',
    name: 'Piloto Señalización Verde',
    category: 'signaling',
    width: 2,
    height: 3,
    defaultTag: '-H',
    description: 'Luz piloto verde (Marcha / Normal)',
    pins: [
      { id: 'X1', label: 'X1', relX: 1, relY: 0, type: 'passive' },
      { id: 'X2', label: 'X2', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'pilot_light_red',
    name: 'Piloto Señalización Rojo',
    category: 'signaling',
    width: 2,
    height: 3,
    defaultTag: '-H',
    description: 'Luz piloto roja (Parada / Emergencia)',
    pins: [
      { id: 'X1', label: 'X1', relX: 1, relY: 0, type: 'passive' },
      { id: 'X2', label: 'X2', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'pilot_light_yellow',
    name: 'Piloto Señalización Ámbar',
    category: 'signaling',
    width: 2,
    height: 3,
    defaultTag: '-H',
    description: 'Luz piloto ámbar (Sobrecarga / Alarma)',
    pins: [
      { id: 'X1', label: 'X1', relX: 1, relY: 0, type: 'passive' },
      { id: 'X2', label: 'X2', relX: 1, relY: 3, type: 'passive' }
    ]
  },
  {
    type: 'horn_siren',
    name: 'Bocina / Zumbador',
    category: 'signaling',
    width: 2,
    height: 3,
    defaultTag: '-H',
    description: 'Avisador acústico sonoro',
    pins: [
      { id: 'X1', label: 'X1', relX: 1, relY: 0, type: 'passive' },
      { id: 'X2', label: 'X2', relX: 1, relY: 3, type: 'passive' }
    ]
  },

  // ==========================================
  // GRAFCET (IEC 60848)
  // ==========================================
  {
    type: 'grafcet_step_init',
    name: 'Etapa Inicial GRAFCET',
    category: 'grafcet',
    width: 2,
    height: 2,
    defaultTag: '0',
    description: 'Etapa activa al inicio de la secuencia automatizada (recuadro doble)',
    pins: [
      { id: 'IN', label: '↑', relX: 1, relY: 0, type: 'input' },
      { id: 'OUT', label: '↓', relX: 1, relY: 2, type: 'output' },
      { id: 'ACT', label: '→', relX: 2, relY: 1, type: 'output' }
    ]
  },
  {
    type: 'grafcet_step',
    name: 'Etapa Normal GRAFCET',
    category: 'grafcet',
    width: 2,
    height: 2,
    defaultTag: '1',
    description: 'Etapa secuencial estándar de control automatizado',
    pins: [
      { id: 'IN', label: '↑', relX: 1, relY: 0, type: 'input' },
      { id: 'OUT', label: '↓', relX: 1, relY: 2, type: 'output' },
      { id: 'ACT', label: '→', relX: 2, relY: 1, type: 'output' }
    ]
  },
  {
    type: 'grafcet_transition',
    name: 'Transición con Receptividad',
    category: 'grafcet',
    width: 2,
    height: 2,
    defaultTag: 'T1',
    description: 'Barrera de validación con condición booleana para franquear la etapa',
    pins: [
      { id: 'IN', label: '↑', relX: 1, relY: 0, type: 'input' },
      { id: 'OUT', label: '↓', relX: 1, relY: 2, type: 'output' }
    ]
  },
  {
    type: 'grafcet_action',
    name: 'Acción Asociada GRAFCET',
    category: 'grafcet',
    width: 3,
    height: 2,
    defaultTag: 'KM1',
    description: 'Acción o comando ejecutado mientras la etapa permanezca activa',
    pins: [
      { id: 'IN', label: '←', relX: 0, relY: 1, type: 'input' }
    ]
  },
  {
    type: 'grafcet_and_divergence',
    name: 'Divergencia Y (Simultánea)',
    category: 'grafcet',
    width: 4,
    height: 2,
    defaultTag: 'AND',
    description: 'Bifurcación en doble barra para activación simultánea de ramas paralelas',
    pins: [
      { id: 'IN', label: '↑', relX: 2, relY: 0, type: 'input' },
      { id: 'OUT1', label: '↓', relX: 1, relY: 2, type: 'output' },
      { id: 'OUT2', label: '↓', relX: 3, relY: 2, type: 'output' }
    ]
  },
  {
    type: 'grafcet_or_divergence',
    name: 'Divergencia O (Alternativa)',
    category: 'grafcet',
    width: 4,
    height: 2,
    defaultTag: 'OR',
    description: 'Bifurcación de selección exclusiva de caminos según receptividades',
    pins: [
      { id: 'IN', label: '↑', relX: 2, relY: 0, type: 'input' },
      { id: 'OUT1', label: '↓', relX: 1, relY: 2, type: 'output' },
      { id: 'OUT2', label: '↓', relX: 3, relY: 2, type: 'output' }
    ]
  },
  {
    type: 'grafcet_jump',
    name: 'Salto / Retorno de Etapa',
    category: 'grafcet',
    width: 2,
    height: 2,
    defaultTag: '→ 0',
    description: 'Enlace de retorno directo a la etapa inicial o fin de ciclo',
    pins: [
      { id: 'IN', label: '↑', relX: 1, relY: 0, type: 'input' }
    ]
  },

  // ==========================================
  // PLC (AUTÓMATAS PROGRAMABLES & LADDER)
  // ==========================================
  {
    type: 'plc_cpu_s71200',
    name: 'PLC Siemens S7-1200 (CPU 1214C)',
    category: 'plc',
    width: 8,
    height: 6,
    defaultTag: 'PLC1',
    description: 'Autómata compacto con entradas digitales I0.0-I0.5 y salidas a relé Q0.0-Q0.3',
    pins: [
      { id: 'L_PLUS', label: 'L+', relX: 1, relY: 0, type: 'power_in', defaultPotential: '+24V' },
      { id: 'M', label: 'M', relX: 2, relY: 0, type: 'power_in', defaultPotential: '0V' },
      { id: 'I0', label: 'I0.0', relX: 3, relY: 0, type: 'input' },
      { id: 'I1', label: 'I0.1', relX: 4, relY: 0, type: 'input' },
      { id: 'I2', label: 'I0.2', relX: 5, relY: 0, type: 'input' },
      { id: 'I3', label: 'I0.3', relX: 6, relY: 0, type: 'input' },
      { id: 'I4', label: 'I0.4', relX: 7, relY: 0, type: 'input' },
      { id: '1L', label: '1L', relX: 1, relY: 6, type: 'power_in' },
      { id: 'Q0', label: 'Q0.0', relX: 3, relY: 6, type: 'output' },
      { id: 'Q1', label: 'Q0.1', relX: 4, relY: 6, type: 'output' },
      { id: 'Q2', label: 'Q0.2', relX: 5, relY: 6, type: 'output' },
      { id: 'Q3', label: 'Q0.3', relX: 6, relY: 6, type: 'output' }
    ]
  },
  {
    type: 'plc_logo',
    name: 'Micro-PLC LOGO! 230RC',
    category: 'plc',
    width: 6,
    height: 5,
    defaultTag: 'LOGO1',
    description: 'Módulo lógico programable inteligente de 4 entradas y 4 relés de salida',
    pins: [
      { id: 'L1', label: 'L1', relX: 1, relY: 0, type: 'power_in', defaultPotential: 'L1' },
      { id: 'N', label: 'N', relX: 2, relY: 0, type: 'power_in', defaultPotential: 'N' },
      { id: 'I1', label: 'I1', relX: 3, relY: 0, type: 'input' },
      { id: 'I2', label: 'I2', relX: 4, relY: 0, type: 'input' },
      { id: 'I3', label: 'I3', relX: 5, relY: 0, type: 'input' },
      { id: 'Q1_1', label: '1', relX: 1, relY: 5, type: 'output' },
      { id: 'Q1_2', label: '2', relX: 2, relY: 5, type: 'output' },
      { id: 'Q2_1', label: '3', relX: 3, relY: 5, type: 'output' },
      { id: 'Q2_2', label: '4', relX: 4, relY: 5, type: 'output' }
    ]
  },
  {
    type: 'plc_input_module',
    name: 'Módulo Entradas Digitales (8x DI)',
    category: 'plc',
    width: 5,
    height: 3,
    defaultTag: 'DI1',
    description: 'Bloque de bornas de captación de señales para pulsadores y finales de carrera',
    pins: [
      { id: 'COM', label: 'COM', relX: 1, relY: 0, type: 'power_in' },
      { id: 'DI0', label: 'I0', relX: 2, relY: 0, type: 'input' },
      { id: 'DI1', label: 'I1', relX: 3, relY: 0, type: 'input' },
      { id: 'DI2', label: 'I2', relX: 4, relY: 0, type: 'input' }
    ]
  },
  {
    type: 'plc_output_module',
    name: 'Módulo Salidas Relé (4x DQ)',
    category: 'plc',
    width: 5,
    height: 3,
    defaultTag: 'DQ1',
    description: 'Bloque de salidas conmutadas a relé para alimentación de bobinas y pilotos',
    pins: [
      { id: 'COM', label: 'COM', relX: 1, relY: 3, type: 'power_in' },
      { id: 'DQ0', label: 'Q0', relX: 2, relY: 3, type: 'output' },
      { id: 'DQ1', label: 'Q1', relX: 3, relY: 3, type: 'output' },
      { id: 'DQ2', label: 'Q2', relX: 4, relY: 3, type: 'output' }
    ]
  },
  {
    type: 'plc_ladder_contact_no',
    name: 'Contacto Ladder NA (%I / %M)',
    category: 'plc',
    width: 2,
    height: 2,
    defaultTag: '%I0.0',
    description: 'Contacto lógico normalmente abierto en diagrama de contactos (Ladder)',
    pins: [
      { id: 'IN', label: '1', relX: 0, relY: 1, type: 'passive' },
      { id: 'OUT', label: '2', relX: 2, relY: 1, type: 'passive' }
    ]
  },
  {
    type: 'plc_ladder_contact_nc',
    name: 'Contacto Ladder NC (%I / %M)',
    category: 'plc',
    width: 2,
    height: 2,
    defaultTag: '%I0.1',
    description: 'Contacto lógico normalmente cerrado en diagrama de contactos (Ladder)',
    pins: [
      { id: 'IN', label: '1', relX: 0, relY: 1, type: 'passive' },
      { id: 'OUT', label: '2', relX: 2, relY: 1, type: 'passive' }
    ]
  },
  {
    type: 'plc_ladder_coil',
    name: 'Bobina Ladder Salida (%Q)',
    category: 'plc',
    width: 2,
    height: 2,
    defaultTag: '%Q0.0',
    description: 'Bobina de asignación directa de salida digital o marca en Ladder',
    pins: [
      { id: 'IN', label: '1', relX: 0, relY: 1, type: 'passive' },
      { id: 'OUT', label: '2', relX: 2, relY: 1, type: 'passive' }
    ]
  },
  {
    type: 'plc_ladder_coil_set',
    name: 'Bobina Ladder SET [S]',
    category: 'plc',
    width: 2,
    height: 2,
    defaultTag: '%Q0.0',
    description: 'Bobina de memorización (SET) en lenguaje Ladder',
    pins: [
      { id: 'IN', label: '1', relX: 0, relY: 1, type: 'passive' },
      { id: 'OUT', label: '2', relX: 2, relY: 1, type: 'passive' }
    ]
  },
  {
    type: 'plc_ladder_coil_reset',
    name: 'Bobina Ladder RESET [R]',
    category: 'plc',
    width: 2,
    height: 2,
    defaultTag: '%Q0.0',
    description: 'Bobina de desmemorización (RESET) en lenguaje Ladder',
    pins: [
      { id: 'IN', label: '1', relX: 0, relY: 1, type: 'passive' },
      { id: 'OUT', label: '2', relX: 2, relY: 1, type: 'passive' }
    ]
  }
];

export const CATEGORY_METADATA = [
  { id: 'power', label: 'Alimentaciones', icon: 'Zap' },
  { id: 'protection', label: 'Fusibles / Automáticos', icon: 'ShieldAlert' },
  { id: 'contactors', label: 'Contactores', icon: 'GitMerge' },
  { id: 'motors', label: 'Motores', icon: 'Cog' },
  { id: 'control', label: 'Pulsadores', icon: 'HandMetal' },
  { id: 'relays', label: 'Bobinas / Temporizadores', icon: 'Clock' },
  { id: 'signaling', label: 'Señalización', icon: 'Lightbulb' },
  { id: 'wires', label: 'Cables / Conexiones', icon: 'Spline' },
  { id: 'grafcet', label: 'GRAFCET', icon: 'Workflow' },
  { id: 'plc', label: 'PLC / Entradas-Salidas', icon: 'Cpu' },
];
