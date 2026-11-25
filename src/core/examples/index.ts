import { CircuitDocument } from '../../types/circuit';
import { TiaProgramDocument } from '../plc/tiaEngine';

export interface ExamplePreset {
  id: string;
  level: number;
  label: string;
  badge: string;
  description: string;
  plantMode: 'conveyor' | 'tank' | 'pneumatic' | 'bottling';
  circuit: CircuitDocument;
  tiaProgram: TiaProgramDocument;
}

// ============================================================================
// NIVEL 1: ARRANQUE DIRECTO DE MOTOR TRIFÁSICO (DOL — POTENCIA)
// ============================================================================
export const DIRECT_STARTER_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: '1. Arranque Directo Trifásico (Base)',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.1',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA ----------------
    { id: 'pow_1', type: 'power_3phase_pe', tag: '3L+PE', x: 6, y: 2, rotation: 0 },
    { id: 'brk_1', type: 'breaker_3p', tag: '-Q1', x: 6, y: 6, rotation: 0, state: { isOpen: false } },
    { id: 'cnt_1', type: 'contactor_power_3p', tag: '-KM1', x: 6, y: 12, rotation: 0 },
    { id: 'thm_1', type: 'thermal_relay_power', tag: '-F1', x: 6, y: 18, rotation: 0, state: { isOpen: false } },
    { id: 'mot_1', type: 'motor_3phase', tag: '-M1', x: 6, y: 24, rotation: 0 },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'pow_ctrl_ln', type: 'power_ln', tag: 'L-N', x: 16, y: 2, rotation: 0 },
    { id: 'brk_ctrl', type: 'breaker_1p_n', tag: '-Q2', x: 16, y: 5, rotation: 0, state: { isOpen: false } },
    { id: 'thm_nc', type: 'thermal_contact_nc', tag: '-F1', x: 16, y: 11, rotation: 0 },
    { id: 'btn_stop', type: 'button_nc', tag: '-S0', x: 16, y: 16, rotation: 0, state: { isActuated: false } },
    { id: 'btn_start', type: 'button_no', tag: '-S1', x: 16, y: 21, rotation: 0, state: { isActuated: false } },
    { id: 'aux_latch', type: 'contact_no', tag: '-KM1', x: 22, y: 21, rotation: 0 },
    { id: 'coil_km1', type: 'coil_contactor', tag: '-KM1', x: 16, y: 26, rotation: 0 },
    { id: 'pilot_run', type: 'pilot_light_green', tag: '-H1', x: 22, y: 26, rotation: 0 }
  ],
  wires: [
    // Potencia: Fuente -> Guardamotor -> Contactor -> Térmico -> Motor
    { id: 'w_p1', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase1' },
    { id: 'w_p2', fromX: 8, fromY: 4, toX: 8, toY: 6, wireType: 'phase2' },
    { id: 'w_p3', fromX: 9, fromY: 4, toX: 9, toY: 6, wireType: 'phase3' },
    { id: 'w_p4', fromX: 7, fromY: 10, toX: 7, toY: 12, wireType: 'phase1' },
    { id: 'w_p5', fromX: 8, fromY: 10, toX: 8, toY: 12, wireType: 'phase2' },
    { id: 'w_p6', fromX: 9, fromY: 10, toX: 9, toY: 12, wireType: 'phase3' },
    { id: 'w_p7', fromX: 7, fromY: 16, toX: 7, toY: 18, wireType: 'phase1' },
    { id: 'w_p8', fromX: 8, fromY: 16, toX: 8, toY: 18, wireType: 'phase2' },
    { id: 'w_p9', fromX: 9, fromY: 16, toX: 9, toY: 18, wireType: 'phase3' },
    { id: 'w_p10', fromX: 7, fromY: 22, toX: 7, toY: 24, wireType: 'phase1' },
    { id: 'w_p11', fromX: 8, fromY: 22, toX: 8, toY: 24, wireType: 'phase2' },
    { id: 'w_p12', fromX: 9, fromY: 22, toX: 9, toY: 24, wireType: 'phase3' },
    { id: 'w_pe', fromX: 10, fromY: 4, toX: 10, toY: 26, wireType: 'pe' },

    // Maniobra Fase L1
    { id: 'w_c1', fromX: 17, fromY: 4, toX: 17, toY: 5, wireType: 'control' },
    { id: 'w_c2', fromX: 17, fromY: 9, toX: 17, toY: 11, wireType: 'control' },
    { id: 'w_c3', fromX: 17, fromY: 14, toX: 17, toY: 16, wireType: 'control' },

    // Bus tras Paro -S0 (split exacto en nodo 17,20)
    { id: 'w_c4a', fromX: 17, fromY: 19, toX: 17, toY: 20, wireType: 'control' },
    { id: 'w_c4b', fromX: 17, fromY: 20, toX: 17, toY: 21, wireType: 'control' },
    { id: 'w_c5', fromX: 17, fromY: 20, toX: 23, toY: 20, wireType: 'control' },
    { id: 'w_c6', fromX: 23, fromY: 20, toX: 23, toY: 21, wireType: 'control' },

    // Bus tras Marcha -S1 y Retención -KM1 (split exacto en nodos 17,25 y 23,25)
    { id: 'w_c7a', fromX: 17, fromY: 24, toX: 17, toY: 25, wireType: 'control' },
    { id: 'w_c7b', fromX: 17, fromY: 25, toX: 17, toY: 26, wireType: 'control' },
    { id: 'w_c8', fromX: 23, fromY: 24, toX: 23, toY: 25, wireType: 'control' },
    { id: 'w_c9', fromX: 23, fromY: 25, toX: 17, toY: 25, wireType: 'control' },
    { id: 'w_c10', fromX: 23, fromY: 25, toX: 23, toY: 26, wireType: 'control' },

    // Retorno Neutro N desde -Q2 (segmentado limpiamente)
    { id: 'w_n0', fromX: 18, fromY: 4, toX: 18, toY: 5, wireType: 'neutral' },
    { id: 'w_n1', fromX: 18, fromY: 9, toX: 27, toY: 9, wireType: 'neutral' },
    { id: 'w_n2', fromX: 27, fromY: 9, toX: 27, toY: 31, wireType: 'neutral' },
    { id: 'w_n3', fromX: 27, fromY: 31, toX: 23, toY: 31, wireType: 'neutral' },
    { id: 'w_n4', fromX: 23, fromY: 31, toX: 17, toY: 31, wireType: 'neutral' },
    { id: 'w_n5', fromX: 17, fromY: 29, toX: 17, toY: 31, wireType: 'neutral' },
    { id: 'w_n6', fromX: 23, fromY: 29, toX: 23, toY: 31, wireType: 'neutral' }
  ],
  junctions: [
    { id: 'j_1', x: 17, y: 20 },
    { id: 'j_2', x: 17, y: 25 },
    { id: 'j_3', x: 23, y: 25 },
    { id: 'j_4', x: 23, y: 31 }
  ]
};

export const DIRECT_STARTER_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Arranque_Directo',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Pulsador_Marcha', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador NA de arranque motor' },
    { address: '%I0.1', name: 'Pulsador_Paro', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador de parada general' },
    { address: '%I0.2', name: 'Rele_Termico_F1', dataType: 'Bool', schematicTag: '-F1', comment: 'Disparo de proteccion termica' },
    { address: '%Q0.0', name: 'Contactor_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Contactor principal motor 3~' },
    { address: '%Q0.1', name: 'Piloto_Marcha_H1', dataType: 'Bool', schematicTag: '-H1', comment: 'Piloto verde motor en marcha' }
  ],
  rungs: [
    {
      id: 'dir_r1',
      number: 1,
      comment: 'Marcha, Paro, Protección Térmica y Autoenclavamiento (-KM1 / -H1)',
      branches: [
        { id: 'dir_b1', contacts: [{ id: 'dir_c1', type: 'NO', address: '%I0.0' }] },
        { id: 'dir_b2', contacts: [{ id: 'dir_c2', type: 'NO', address: '%Q0.0' }] }
      ],
      seriesContacts: [
        { id: 'dir_c3', type: 'NC', address: '%I0.1' },
        { id: 'dir_c4', type: 'NC', address: '%I0.2' }
      ],
      coils: [
        { id: 'dir_q1', type: 'OUT', address: '%Q0.0' },
        { id: 'dir_q2', type: 'OUT', address: '%Q0.1' }
      ]
    }
  ],
  sclCode: `// Nivel 1: Arranque Directo Trifasico (DOL) — OB1
// Autor: Simon Barrera Ruiz

IF ("Pulsador_Marcha" OR "Contactor_KM1") AND NOT "Pulsador_Paro" AND NOT "Rele_Termico_F1" THEN
    "Contactor_KM1" := TRUE;
    "Piloto_Marcha_H1" := TRUE;
ELSE
    "Contactor_KM1" := FALSE;
    "Piloto_Marcha_H1" := FALSE;
END_IF;
`,
  grafcetSteps: [
    { id: 0, name: 'Reposo', isInitial: true, actionTag: '', actionLabel: 'Motor detenido — Esperando pulsador -S1' },
    { id: 1, name: 'Marcha', isInitial: false, actionTag: '%Q0.0', actionLabel: 'Motor en Marcha (-KM1 + Piloto -H1)' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND NOT %I0.1 AND NOT %I0.2', label: 'Marcha (-S1) sin falla' },
    { id: 2, fromStep: 1, toStep: 0, condition: '%I0.1 OR %I0.2', label: 'Paro (-S0) o Térmico (-F1)' }
  ]
};

// ============================================================================
// NIVEL 2: INVERSIÓN DE GIRO 3~ CON DOBLE ENCLAVAMIENTO (IEC 60947)
// ============================================================================
export const REVERSE_STARTER_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: '2. Inversión de Giro 3~ con Enclavamiento',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.1',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA (FUERZA) ----------------
    { id: 'pow_1', type: 'power_3phase_pe', tag: '3L+PE', x: 4, y: 2, rotation: 0 },
    { id: 'brk_1', type: 'breaker_3p', tag: '-Q1', x: 4, y: 6, rotation: 0, state: { isOpen: false } },
    { id: 'cnt_km1', type: 'contactor_power_3p', tag: '-KM1', x: 4, y: 14, rotation: 0 },
    { id: 'cnt_km2', type: 'contactor_power_3p', tag: '-KM2', x: 10, y: 14, rotation: 0 },
    { id: 'thm_1', type: 'thermal_relay_power', tag: '-F1', x: 4, y: 22, rotation: 0, state: { isOpen: false } },
    { id: 'mot_1', type: 'motor_3phase', tag: '-M1', x: 4, y: 28, rotation: 0 },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'pow_ctrl_ln', type: 'power_ln', tag: 'L-N', x: 20, y: 2, rotation: 0 },
    { id: 'brk_ctrl', type: 'breaker_1p_n', tag: '-Q2', x: 20, y: 5, rotation: 0, state: { isOpen: false } },
    { id: 'thm_nc', type: 'thermal_contact_nc', tag: '-F1', x: 20, y: 10, rotation: 0 },
    { id: 'btn_stop', type: 'button_nc', tag: '-S0', x: 20, y: 14, rotation: 0, state: { isActuated: false } },

    // Rama 1: Sentido Horario (CW)
    { id: 'btn_start_cw', type: 'button_no', tag: '-S1', x: 20, y: 19, rotation: 0, state: { isActuated: false } },
    { id: 'aux_km1_latch', type: 'contact_no', tag: '-KM1', x: 25, y: 19, rotation: 0 },
    { id: 'aux_km2_nc', type: 'contact_nc', tag: '-KM2', x: 20, y: 24, rotation: 0 },
    { id: 'coil_km1', type: 'coil_contactor', tag: '-KM1', x: 20, y: 28, rotation: 0 },
    { id: 'pilot_cw', type: 'pilot_light_green', tag: '-H1', x: 25, y: 28, rotation: 0 },

    // Rama 2: Sentido Antihorario (CCW)
    { id: 'btn_start_ccw', type: 'button_no', tag: '-S2', x: 31, y: 19, rotation: 0, state: { isActuated: false } },
    { id: 'aux_km2_latch', type: 'contact_no', tag: '-KM2', x: 36, y: 19, rotation: 0 },
    { id: 'aux_km1_nc', type: 'contact_nc', tag: '-KM1', x: 31, y: 24, rotation: 0 },
    { id: 'coil_km2', type: 'coil_contactor', tag: '-KM2', x: 31, y: 28, rotation: 0 },
    { id: 'pilot_ccw', type: 'pilot_light_yellow', tag: '-H2', x: 36, y: 28, rotation: 0 },

    // Rama 3: Piloto Rojo de Parada
    { id: 'aux_km1_stop_nc', type: 'contact_nc', tag: '-KM1', x: 42, y: 19, rotation: 0 },
    { id: 'aux_km2_stop_nc', type: 'contact_nc', tag: '-KM2', x: 42, y: 23, rotation: 0 },
    { id: 'pilot_stop', type: 'pilot_light_red', tag: '-H0', x: 42, y: 28, rotation: 0 }
  ],
  wires: [
    // ---------------- POTENCIA ----------------
    { id: 'w_rev_p1', fromX: 5, fromY: 4, toX: 5, toY: 6, wireType: 'phase1' },
    { id: 'w_rev_p2', fromX: 6, fromY: 4, toX: 6, toY: 6, wireType: 'phase2' },
    { id: 'w_rev_p3', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase3' },

    // Guardamotor a KM1 y derivación escalonada sin solape a KM2 (y=11,12,13)
    { id: 'w_rev_p4', fromX: 5, fromY: 10, toX: 5, toY: 11, wireType: 'phase1' },
    { id: 'w_rev_p5', fromX: 5, fromY: 11, toX: 5, toY: 14, wireType: 'phase1' },
    { id: 'w_rev_p6', fromX: 5, fromY: 11, toX: 11, toY: 11, wireType: 'phase1' },
    { id: 'w_rev_p7', fromX: 11, fromY: 11, toX: 11, toY: 14, wireType: 'phase1' },

    { id: 'w_rev_p8', fromX: 6, fromY: 10, toX: 6, toY: 12, wireType: 'phase2' },
    { id: 'w_rev_p9', fromX: 6, fromY: 12, toX: 6, toY: 14, wireType: 'phase2' },
    { id: 'w_rev_p10', fromX: 6, fromY: 12, toX: 12, toY: 12, wireType: 'phase2' },
    { id: 'w_rev_p11', fromX: 12, fromY: 12, toX: 12, toY: 14, wireType: 'phase2' },

    { id: 'w_rev_p12', fromX: 7, fromY: 10, toX: 7, toY: 13, wireType: 'phase3' },
    { id: 'w_rev_p13', fromX: 7, fromY: 13, toX: 7, toY: 14, wireType: 'phase3' },
    { id: 'w_rev_p14', fromX: 7, fromY: 13, toX: 13, toY: 13, wireType: 'phase3' },
    { id: 'w_rev_p15', fromX: 13, fromY: 13, toX: 13, toY: 14, wireType: 'phase3' },

    // Salida KM1 directa a Térmico F1 con nodos de cruce en y=19,20,21
    { id: 'w_rev_p16', fromX: 5, fromY: 18, toX: 5, toY: 19, wireType: 'phase1' },
    { id: 'w_rev_p17', fromX: 5, fromY: 19, toX: 5, toY: 22, wireType: 'phase1' },
    { id: 'w_rev_p18', fromX: 6, fromY: 18, toX: 6, toY: 20, wireType: 'phase2' },
    { id: 'w_rev_p19', fromX: 6, fromY: 20, toX: 6, toY: 22, wireType: 'phase2' },
    { id: 'w_rev_p20', fromX: 7, fromY: 18, toX: 7, toY: 21, wireType: 'phase3' },
    { id: 'w_rev_p21', fromX: 7, fromY: 21, toX: 7, toY: 22, wireType: 'phase3' },

    // Cruce de fases en KM2 (L3->U1, L2->V1, L1->W1)
    { id: 'w_rev_p22', fromX: 13, fromY: 18, toX: 13, toY: 19, wireType: 'phase3' },
    { id: 'w_rev_p23', fromX: 13, fromY: 19, toX: 5, toY: 19, wireType: 'phase3' },
    { id: 'w_rev_p24', fromX: 12, fromY: 18, toX: 12, toY: 20, wireType: 'phase2' },
    { id: 'w_rev_p25', fromX: 12, fromY: 20, toX: 6, toY: 20, wireType: 'phase2' },
    { id: 'w_rev_p26', fromX: 11, fromY: 18, toX: 11, toY: 21, wireType: 'phase1' },
    { id: 'w_rev_p27', fromX: 11, fromY: 21, toX: 7, toY: 21, wireType: 'phase1' },

    // Térmico a Motor
    { id: 'w_rev_p28', fromX: 5, fromY: 26, toX: 5, toY: 28, wireType: 'phase1' },
    { id: 'w_rev_p29', fromX: 6, fromY: 26, toX: 6, toY: 28, wireType: 'phase2' },
    { id: 'w_rev_p30', fromX: 7, fromY: 26, toX: 7, toY: 28, wireType: 'phase3' },
    { id: 'w_rev_pe', fromX: 8, fromY: 4, toX: 8, toY: 30, wireType: 'pe' },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'w_rev_c1', fromX: 21, fromY: 4, toX: 21, toY: 5, wireType: 'control' },
    { id: 'w_rev_c2', fromX: 21, fromY: 9, toX: 21, toY: 10, wireType: 'control' },
    { id: 'w_rev_c3', fromX: 21, fromY: 13, toX: 21, toY: 14, wireType: 'control' },
    { id: 'w_rev_c4', fromX: 21, fromY: 17, toX: 21, toY: 18, wireType: 'control' },

    // Bus superior y=18 segmentado en cada columna (21 -> 26 -> 32 -> 37 -> 43)
    { id: 'w_rev_c5', fromX: 21, fromY: 18, toX: 26, toY: 18, wireType: 'control' },
    { id: 'w_rev_c6', fromX: 26, fromY: 18, toX: 32, toY: 18, wireType: 'control' },
    { id: 'w_rev_c7', fromX: 32, fromY: 18, toX: 37, toY: 18, wireType: 'control' },
    { id: 'w_rev_c8', fromX: 37, fromY: 18, toX: 43, toY: 18, wireType: 'control' },

    // Rama 1: Horario CW (-S1 || -KM1 -> -KM2 NC -> -KM1 || -H1)
    { id: 'w_rev_c9', fromX: 21, fromY: 18, toX: 21, toY: 19, wireType: 'control' },
    { id: 'w_rev_c10', fromX: 26, fromY: 18, toX: 26, toY: 19, wireType: 'control' },
    { id: 'w_rev_c11', fromX: 21, fromY: 22, toX: 21, toY: 23, wireType: 'control' },
    { id: 'w_rev_c12', fromX: 26, fromY: 22, toX: 26, toY: 23, wireType: 'control' },
    { id: 'w_rev_c13', fromX: 26, fromY: 23, toX: 21, toY: 23, wireType: 'control' },
    { id: 'w_rev_c14', fromX: 21, fromY: 23, toX: 21, toY: 24, wireType: 'control' },
    { id: 'w_rev_c15', fromX: 21, fromY: 27, toX: 21, toY: 28, wireType: 'control' },
    { id: 'w_rev_c16', fromX: 21, fromY: 28, toX: 26, toY: 28, wireType: 'control' },

    // Rama 2: Antihorario CCW (-S2 || -KM2 -> -KM1 NC -> -KM2 || -H2)
    { id: 'w_rev_c17', fromX: 32, fromY: 18, toX: 32, toY: 19, wireType: 'control' },
    { id: 'w_rev_c18', fromX: 37, fromY: 18, toX: 37, toY: 19, wireType: 'control' },
    { id: 'w_rev_c19', fromX: 32, fromY: 22, toX: 32, toY: 23, wireType: 'control' },
    { id: 'w_rev_c20', fromX: 37, fromY: 22, toX: 37, toY: 23, wireType: 'control' },
    { id: 'w_rev_c21', fromX: 37, fromY: 23, toX: 32, toY: 23, wireType: 'control' },
    { id: 'w_rev_c22', fromX: 32, fromY: 23, toX: 32, toY: 24, wireType: 'control' },
    { id: 'w_rev_c23', fromX: 32, fromY: 27, toX: 32, toY: 28, wireType: 'control' },
    { id: 'w_rev_c24', fromX: 32, fromY: 28, toX: 37, toY: 28, wireType: 'control' },

    // Rama 3: Señalización de Parada (-H0)
    { id: 'w_rev_c25', fromX: 43, fromY: 18, toX: 43, toY: 19, wireType: 'control' },
    { id: 'w_rev_c26', fromX: 43, fromY: 22, toX: 43, toY: 23, wireType: 'control' },
    { id: 'w_rev_c27', fromX: 43, fromY: 26, toX: 43, toY: 28, wireType: 'control' },

    // Neutro N desde -Q2 segmentado en cada carga (y=33)
    { id: 'w_rev_n0', fromX: 22, fromY: 4, toX: 22, toY: 5, wireType: 'neutral' },
    { id: 'w_rev_n1', fromX: 22, fromY: 9, toX: 47, toY: 9, wireType: 'neutral' },
    { id: 'w_rev_n2', fromX: 47, fromY: 9, toX: 47, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n3', fromX: 47, fromY: 33, toX: 43, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n4', fromX: 43, fromY: 33, toX: 37, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n5', fromX: 37, fromY: 33, toX: 32, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n6', fromX: 32, fromY: 33, toX: 26, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n7', fromX: 26, fromY: 33, toX: 21, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n8', fromX: 21, fromY: 31, toX: 21, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n9', fromX: 26, fromY: 31, toX: 26, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n10', fromX: 32, fromY: 31, toX: 32, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n11', fromX: 37, fromY: 31, toX: 37, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n12', fromX: 43, fromY: 31, toX: 43, toY: 33, wireType: 'neutral' }
  ],
  junctions: [
    { id: 'j_rev_p1', x: 5, y: 11 },
    { id: 'j_rev_p2', x: 6, y: 12 },
    { id: 'j_rev_p3', x: 7, y: 13 },
    { id: 'j_rev_p4', x: 5, y: 19 },
    { id: 'j_rev_p5', x: 6, y: 20 },
    { id: 'j_rev_p6', x: 7, y: 21 },
    { id: 'j_rev_c1', x: 21, y: 18 },
    { id: 'j_rev_c2', x: 26, y: 18 },
    { id: 'j_rev_c3', x: 32, y: 18 },
    { id: 'j_rev_c4', x: 37, y: 18 },
    { id: 'j_rev_c5', x: 21, y: 23 },
    { id: 'j_rev_c6', x: 21, y: 28 },
    { id: 'j_rev_c7', x: 32, y: 23 },
    { id: 'j_rev_c8', x: 32, y: 28 },
    { id: 'j_rev_n1', x: 26, y: 33 },
    { id: 'j_rev_n2', x: 32, y: 33 },
    { id: 'j_rev_n3', x: 37, y: 33 },
    { id: 'j_rev_n4', x: 43, y: 33 }
  ]
};

export const REVERSE_STARTER_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Inversion_Giro',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Marcha_Horario_S1', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador giro horario (CW)' },
    { address: '%I0.1', name: 'Pulsador_Paro_S0', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador de parada general' },
    { address: '%I0.2', name: 'Marcha_Antihorario_S2', dataType: 'Bool', schematicTag: '-S2', comment: 'Pulsador giro antihorario (CCW)' },
    { address: '%I0.3', name: 'Rele_Termico_F1', dataType: 'Bool', schematicTag: '-F1', comment: 'Disparo rele termico sobrecarga' },
    { address: '%Q0.0', name: 'Contactor_Horario_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Contactor sentido horario CW' },
    { address: '%Q0.1', name: 'Contactor_Antihorario_KM2', dataType: 'Bool', schematicTag: '-KM2', comment: 'Contactor sentido antihorario CCW' },
    { address: '%Q0.2', name: 'Piloto_Parada_H0', dataType: 'Bool', schematicTag: '-H0', comment: 'Piloto rojo motor detenido' }
  ],
  rungs: [
    {
      id: 'rev_r1',
      number: 1,
      comment: 'Giro Horario (CW) con enclavamiento cruzado NC de -KM2 (%Q0.1)',
      branches: [
        { id: 'rev_b1', contacts: [{ id: 'rev_c1', type: 'NO', address: '%I0.0' }] },
        { id: 'rev_b2', contacts: [{ id: 'rev_c2', type: 'NO', address: '%Q0.0' }] }
      ],
      seriesContacts: [
        { id: 'rev_c3', type: 'NC', address: '%I0.1' },
        { id: 'rev_c4', type: 'NC', address: '%I0.3' },
        { id: 'rev_c5', type: 'NC', address: '%Q0.1' }
      ],
      coils: [{ id: 'rev_q1', type: 'OUT', address: '%Q0.0' }]
    },
    {
      id: 'rev_r2',
      number: 2,
      comment: 'Giro Antihorario (CCW) con enclavamiento cruzado NC de -KM1 (%Q0.0)',
      branches: [
        { id: 'rev_b3', contacts: [{ id: 'rev_c6', type: 'NO', address: '%I0.2' }] },
        { id: 'rev_b4', contacts: [{ id: 'rev_c7', type: 'NO', address: '%Q0.1' }] }
      ],
      seriesContacts: [
        { id: 'rev_c8', type: 'NC', address: '%I0.1' },
        { id: 'rev_c9', type: 'NC', address: '%I0.3' },
        { id: 'rev_c10', type: 'NC', address: '%Q0.0' }
      ],
      coils: [{ id: 'rev_q2', type: 'OUT', address: '%Q0.1' }]
    },
    {
      id: 'rev_r3',
      number: 3,
      comment: 'Piloto Rojo de Motor Detenido (-H0)',
      branches: [{ id: 'rev_b5', contacts: [{ id: 'rev_c11', type: 'NC', address: '%Q0.0' }] }],
      seriesContacts: [{ id: 'rev_c12', type: 'NC', address: '%Q0.1' }],
      coils: [{ id: 'rev_q3', type: 'OUT', address: '%Q0.2' }]
    }
  ],
  sclCode: `// Nivel 2: Inversion de Giro Trifasico con Enclavamiento Mutuo — OB1
// Autor: Simon Barrera Ruiz

IF ("Marcha_Horario_S1" OR "Contactor_Horario_KM1") AND NOT "Pulsador_Paro_S0" AND NOT "Rele_Termico_F1" AND NOT "Contactor_Antihorario_KM2" THEN
    "Contactor_Horario_KM1" := TRUE;
ELSE
    "Contactor_Horario_KM1" := FALSE;
END_IF;

IF ("Marcha_Antihorario_S2" OR "Contactor_Antihorario_KM2") AND NOT "Pulsador_Paro_S0" AND NOT "Rele_Termico_F1" AND NOT "Contactor_Horario_KM1" THEN
    "Contactor_Antihorario_KM2" := TRUE;
ELSE
    "Contactor_Antihorario_KM2" := FALSE;
END_IF;

"Piloto_Parada_H0" := NOT "Contactor_Horario_KM1" AND NOT "Contactor_Antihorario_KM2";
`,
  grafcetSteps: [
    { id: 0, name: 'Reposo', isInitial: true, actionTag: '%Q0.2', actionLabel: 'Motor detenido (Piloto Rojo -H0)' },
    { id: 1, name: 'Giro CW', isInitial: false, actionTag: '%Q0.0', actionLabel: 'Giro Horario (-KM1 + Piloto Verde -H1)' },
    { id: 2, name: 'Giro CCW', isInitial: false, actionTag: '%Q0.1', actionLabel: 'Giro Antihorario (-KM2 + Piloto Ámbar -H2)' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND NOT %I0.1 AND NOT %I0.2 AND NOT %I0.3', label: 'Marcha Horaria (-S1)' },
    { id: 2, fromStep: 1, toStep: 0, condition: '%I0.1 OR %I0.3', label: 'Paro (-S0) / Térmico (-F1)' },
    { id: 3, fromStep: 0, toStep: 2, condition: '%I0.2 AND NOT %I0.1 AND NOT %I0.0 AND NOT %I0.3', label: 'Marcha Antihoraria (-S2)' },
    { id: 4, fromStep: 2, toStep: 0, condition: '%I0.1 OR %I0.3', label: 'Paro (-S0) / Térmico (-F1)' }
  ]
};

// ============================================================================
// NIVEL 3: ARRANQUE ESTRELLA - TRIÁNGULO (Y-Δ) AUTOMÁTICO CON TON 5S
// ============================================================================
export const STAR_DELTA_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: '3. Arranque Estrella - Triángulo (Y-Δ)',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.1',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA (FUERZA) ----------------
    { id: 'pow_1', type: 'power_3phase_pe', tag: '3L+PE', x: 4, y: 2, rotation: 0 },
    { id: 'brk_1', type: 'breaker_3p', tag: '-Q1', x: 4, y: 6, rotation: 0, state: { isOpen: false } },
    { id: 'cnt_km1', type: 'contactor_power_3p', tag: '-KM1', x: 4, y: 14, rotation: 0 },
    { id: 'thm_1', type: 'thermal_relay_power', tag: '-F1', x: 4, y: 20, rotation: 0, state: { isOpen: false } },
    { id: 'mot_1', type: 'motor_3phase_6p', tag: '-M1', x: 4, y: 26, rotation: 0 },
    { id: 'cnt_km2', type: 'contactor_power_3p', tag: '-KM2', x: 11, y: 20, rotation: 0 },
    { id: 'cnt_km3', type: 'contactor_power_3p', tag: '-KM3', x: 17, y: 20, rotation: 0 },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'pow_ctrl_ln', type: 'power_ln', tag: 'L-N', x: 26, y: 2, rotation: 0 },
    { id: 'brk_ctrl', type: 'breaker_1p_n', tag: '-Q2', x: 26, y: 5, rotation: 0, state: { isOpen: false } },
    { id: 'thm_nc', type: 'thermal_contact_nc', tag: '-F1', x: 26, y: 10, rotation: 0 },
    { id: 'btn_stop', type: 'button_nc', tag: '-S0', x: 26, y: 14, rotation: 0, state: { isActuated: false } },
    { id: 'btn_start', type: 'button_no', tag: '-S1', x: 26, y: 19, rotation: 0, state: { isActuated: false } },
    { id: 'aux_km1_latch', type: 'contact_no', tag: '-KM1', x: 31, y: 19, rotation: 0 },
    { id: 'coil_km1', type: 'coil_contactor', tag: '-KM1', x: 26, y: 26, rotation: 0 },
    { id: 'coil_kt1', type: 'coil_timer_ton', tag: '-KT1', timerValue: 5, x: 31, y: 26, rotation: 0 },
    { id: 'aux_kt1_nc', type: 'contact_timer_ton_nc', tag: '-KT1', x: 36, y: 24, rotation: 0 },
    { id: 'aux_km2_nc', type: 'contact_nc', tag: '-KM2', x: 36, y: 28, rotation: 0 },
    { id: 'coil_km3', type: 'coil_contactor', tag: '-KM3', x: 36, y: 32, rotation: 0 },
    { id: 'aux_kt1_no', type: 'contact_timer_ton_no', tag: '-KT1', x: 41, y: 24, rotation: 0 },
    { id: 'aux_km3_nc', type: 'contact_nc', tag: '-KM3', x: 41, y: 28, rotation: 0 },
    { id: 'coil_km2', type: 'coil_contactor', tag: '-KM2', x: 41, y: 32, rotation: 0 },
    { id: 'pilot_run', type: 'pilot_light_green', tag: '-H1', x: 46, y: 26, rotation: 0 },
    { id: 'pilot_delta', type: 'pilot_light_yellow', tag: '-H2', x: 50, y: 32, rotation: 0 }
  ],
  wires: [
    // ---------------- POTENCIA ----------------
    { id: 'w_sd_p1', fromX: 5, fromY: 4, toX: 5, toY: 6, wireType: 'phase1' },
    { id: 'w_sd_p2', fromX: 6, fromY: 4, toX: 6, toY: 6, wireType: 'phase2' },
    { id: 'w_sd_p3', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase3' },

    // Derivación escalonada sin solape hacia KM1 (Línea) y KM2 (Triángulo)
    { id: 'w_sd_p4', fromX: 5, fromY: 10, toX: 5, toY: 11, wireType: 'phase1' },
    { id: 'w_sd_p5', fromX: 5, fromY: 11, toX: 5, toY: 14, wireType: 'phase1' },
    { id: 'w_sd_p6', fromX: 5, fromY: 11, toX: 12, toY: 11, wireType: 'phase1' },
    { id: 'w_sd_p7', fromX: 12, fromY: 11, toX: 12, toY: 20, wireType: 'phase1' },

    { id: 'w_sd_p8', fromX: 6, fromY: 10, toX: 6, toY: 12, wireType: 'phase2' },
    { id: 'w_sd_p9', fromX: 6, fromY: 12, toX: 6, toY: 14, wireType: 'phase2' },
    { id: 'w_sd_p10', fromX: 6, fromY: 12, toX: 13, toY: 12, wireType: 'phase2' },
    { id: 'w_sd_p11', fromX: 13, fromY: 12, toX: 13, toY: 20, wireType: 'phase2' },

    { id: 'w_sd_p12', fromX: 7, fromY: 10, toX: 7, toY: 13, wireType: 'phase3' },
    { id: 'w_sd_p13', fromX: 7, fromY: 13, toX: 7, toY: 14, wireType: 'phase3' },
    { id: 'w_sd_p14', fromX: 7, fromY: 13, toX: 14, toY: 13, wireType: 'phase3' },
    { id: 'w_sd_p15', fromX: 14, fromY: 13, toX: 14, toY: 20, wireType: 'phase3' },

    // Contactor KM1 -> Térmico F1 -> Motor U1, V1, W1
    { id: 'w_sd_p16', fromX: 5, fromY: 18, toX: 5, toY: 20, wireType: 'phase1' },
    { id: 'w_sd_p17', fromX: 6, fromY: 18, toX: 6, toY: 20, wireType: 'phase2' },
    { id: 'w_sd_p18', fromX: 7, fromY: 18, toX: 7, toY: 20, wireType: 'phase3' },
    { id: 'w_sd_p19', fromX: 5, fromY: 24, toX: 5, toY: 26, wireType: 'phase1' },
    { id: 'w_sd_p20', fromX: 6, fromY: 24, toX: 6, toY: 26, wireType: 'phase2' },
    { id: 'w_sd_p21', fromX: 7, fromY: 24, toX: 7, toY: 26, wireType: 'phase3' },
    { id: 'w_sd_pe', fromX: 8, fromY: 4, toX: 8, toY: 28, wireType: 'pe' },

    // Bornes W2(5,31), U2(6,31), V2(7,31) hacia KM2 (Triángulo) y KM3 (Estrella)
    { id: 'w_sd_p22', fromX: 5, fromY: 31, toX: 5, toY: 33, wireType: 'phase1' },
    { id: 'w_sd_p23', fromX: 5, fromY: 33, toX: 12, toY: 33, wireType: 'phase1' },
    { id: 'w_sd_p24', fromX: 12, fromY: 33, toX: 12, toY: 24, wireType: 'phase1' },
    { id: 'w_sd_p25', fromX: 12, fromY: 33, toX: 18, toY: 33, wireType: 'phase1' },
    { id: 'w_sd_p26', fromX: 18, fromY: 33, toX: 18, toY: 24, wireType: 'phase1' },

    { id: 'w_sd_p27', fromX: 6, fromY: 31, toX: 6, toY: 34, wireType: 'phase2' },
    { id: 'w_sd_p28', fromX: 6, fromY: 34, toX: 13, toY: 34, wireType: 'phase2' },
    { id: 'w_sd_p29', fromX: 13, fromY: 34, toX: 13, toY: 24, wireType: 'phase2' },
    { id: 'w_sd_p30', fromX: 13, fromY: 34, toX: 19, toY: 34, wireType: 'phase2' },
    { id: 'w_sd_p31', fromX: 19, fromY: 34, toX: 19, toY: 24, wireType: 'phase2' },

    { id: 'w_sd_p32', fromX: 7, fromY: 31, toX: 7, toY: 35, wireType: 'phase3' },
    { id: 'w_sd_p33', fromX: 7, fromY: 35, toX: 14, toY: 35, wireType: 'phase3' },
    { id: 'w_sd_p34', fromX: 14, fromY: 35, toX: 14, toY: 24, wireType: 'phase3' },
    { id: 'w_sd_p35', fromX: 14, fromY: 35, toX: 20, toY: 35, wireType: 'phase3' },
    { id: 'w_sd_p36', fromX: 20, fromY: 35, toX: 20, toY: 24, wireType: 'phase3' },

    // Puente Estrella en la parte superior de KM3 (18,18)-(20,18)
    { id: 'w_sd_p37', fromX: 18, fromY: 20, toX: 18, toY: 18, wireType: 'phase1' },
    { id: 'w_sd_p38', fromX: 19, fromY: 20, toX: 19, toY: 18, wireType: 'phase2' },
    { id: 'w_sd_p39', fromX: 20, fromY: 20, toX: 20, toY: 18, wireType: 'phase3' },
    { id: 'w_sd_p40', fromX: 18, fromY: 18, toX: 19, toY: 18, wireType: 'phase1' },
    { id: 'w_sd_p41', fromX: 19, fromY: 18, toX: 20, toY: 18, wireType: 'phase1' },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'w_sd_c1', fromX: 27, fromY: 4, toX: 27, toY: 5, wireType: 'control' },
    { id: 'w_sd_c2', fromX: 27, fromY: 9, toX: 27, toY: 10, wireType: 'control' },
    { id: 'w_sd_c3', fromX: 27, fromY: 13, toX: 27, toY: 14, wireType: 'control' },
    { id: 'w_sd_c4', fromX: 27, fromY: 17, toX: 27, toY: 18, wireType: 'control' },

    // Paralelo Marcha -S1 y Retención -KM1
    { id: 'w_sd_c5', fromX: 27, fromY: 18, toX: 32, toY: 18, wireType: 'control' },
    { id: 'w_sd_c6', fromX: 32, fromY: 18, toX: 32, toY: 19, wireType: 'control' },
    { id: 'w_sd_c7', fromX: 27, fromY: 18, toX: 27, toY: 19, wireType: 'control' },
    { id: 'w_sd_c8', fromX: 27, fromY: 22, toX: 27, toY: 23, wireType: 'control' },
    { id: 'w_sd_c9', fromX: 32, fromY: 22, toX: 32, toY: 23, wireType: 'control' },

    // Bus Activo de Marcha y=23 segmentado (27 -> 32 -> 37 -> 42 -> 47)
    { id: 'w_sd_c10', fromX: 27, fromY: 23, toX: 32, toY: 23, wireType: 'control' },
    { id: 'w_sd_c11', fromX: 32, fromY: 23, toX: 37, toY: 23, wireType: 'control' },
    { id: 'w_sd_c12', fromX: 37, fromY: 23, toX: 42, toY: 23, wireType: 'control' },
    { id: 'w_sd_c13', fromX: 42, fromY: 23, toX: 47, toY: 23, wireType: 'control' },

    // Rama 1: Bobina KM1 (Línea)
    { id: 'w_sd_c14', fromX: 27, fromY: 23, toX: 27, toY: 26, wireType: 'control' },
    // Rama 2: Bobina KT1 (Temporizador TON 5s)
    { id: 'w_sd_c15', fromX: 32, fromY: 23, toX: 32, toY: 26, wireType: 'control' },
    // Rama 3: KT1 NC -> KM2 NC -> Bobina KM3 (Estrella)
    { id: 'w_sd_c16', fromX: 37, fromY: 23, toX: 37, toY: 24, wireType: 'control' },
    { id: 'w_sd_c17', fromX: 37, fromY: 27, toX: 37, toY: 28, wireType: 'control' },
    { id: 'w_sd_c18', fromX: 37, fromY: 31, toX: 37, toY: 32, wireType: 'control' },
    // Rama 4: KT1 NA -> KM3 NC -> Bobina KM2 (Triángulo) + Piloto H2
    { id: 'w_sd_c19', fromX: 42, fromY: 23, toX: 42, toY: 24, wireType: 'control' },
    { id: 'w_sd_c20', fromX: 42, fromY: 27, toX: 42, toY: 28, wireType: 'control' },
    { id: 'w_sd_c21', fromX: 42, fromY: 31, toX: 42, toY: 32, wireType: 'control' },
    { id: 'w_sd_c22', fromX: 42, fromY: 31, toX: 51, toY: 31, wireType: 'control' },
    { id: 'w_sd_c23', fromX: 51, fromY: 31, toX: 51, toY: 32, wireType: 'control' },
    // Rama 5: Piloto Verde H1 (Marcha)
    { id: 'w_sd_c24', fromX: 47, fromY: 23, toX: 47, toY: 26, wireType: 'control' },

    // Retorno de Neutro N desde -Q2 segmentado en cada bobina/piloto (y=37)
    { id: 'w_sd_n0', fromX: 28, fromY: 4, toX: 28, toY: 5, wireType: 'neutral' },
    { id: 'w_sd_n1', fromX: 28, fromY: 9, toX: 54, toY: 9, wireType: 'neutral' },
    { id: 'w_sd_n2', fromX: 54, fromY: 9, toX: 54, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n3', fromX: 54, fromY: 37, toX: 51, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n4', fromX: 51, fromY: 37, toX: 47, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n5', fromX: 47, fromY: 37, toX: 42, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n6', fromX: 42, fromY: 37, toX: 37, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n7', fromX: 37, fromY: 37, toX: 32, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n8', fromX: 32, fromY: 37, toX: 27, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n9', fromX: 27, fromY: 29, toX: 27, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n10', fromX: 32, fromY: 29, toX: 32, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n11', fromX: 37, fromY: 35, toX: 37, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n12', fromX: 42, fromY: 35, toX: 42, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n13', fromX: 47, fromY: 29, toX: 47, toY: 37, wireType: 'neutral' },
    { id: 'w_sd_n14', fromX: 51, fromY: 35, toX: 51, toY: 37, wireType: 'neutral' }
  ],
  junctions: [
    { id: 'j_sd_p1', x: 5, y: 11 },
    { id: 'j_sd_p2', x: 6, y: 12 },
    { id: 'j_sd_p3', x: 7, y: 13 },
    { id: 'j_sd_p4', x: 12, y: 33 },
    { id: 'j_sd_p5', x: 13, y: 34 },
    { id: 'j_sd_p6', x: 14, y: 35 },
    { id: 'j_sd_p7', x: 19, y: 18 },
    { id: 'j_sd_c1', x: 27, y: 18 },
    { id: 'j_sd_c2', x: 27, y: 23 },
    { id: 'j_sd_c3', x: 32, y: 23 },
    { id: 'j_sd_c4', x: 37, y: 23 },
    { id: 'j_sd_c5', x: 42, y: 23 },
    { id: 'j_sd_c6', x: 42, y: 31 },
    { id: 'j_sd_n1', x: 32, y: 37 },
    { id: 'j_sd_n2', x: 37, y: 37 },
    { id: 'j_sd_n3', x: 42, y: 37 },
    { id: 'j_sd_n4', x: 47, y: 37 },
    { id: 'j_sd_n5', x: 51, y: 37 }
  ]
};

export const STAR_DELTA_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Estrella_Triangulo',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Pulsador_Marcha_S1', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador NA arranque Y-Delta' },
    { address: '%I0.1', name: 'Pulsador_Paro_S0', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador de parada general' },
    { address: '%I0.2', name: 'Rele_Termico_F1', dataType: 'Bool', schematicTag: '-F1', comment: 'Proteccion sobrecarga motor' },
    { address: '%Q0.0', name: 'Contactor_Linea_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Contactor principal de linea' },
    { address: '%Q0.1', name: 'Contactor_Estrella_KM3', dataType: 'Bool', schematicTag: '-KM3', comment: 'Contactor estrella arranque' },
    { address: '%Q0.2', name: 'Contactor_Triangulo_KM2', dataType: 'Bool', schematicTag: '-KM2', comment: 'Contactor triangulo regimen' },
    { address: '%Q0.3', name: 'Piloto_Regimen_H2', dataType: 'Bool', schematicTag: '-H2', comment: 'Piloto ambar regimen triangulo' },
    { address: '%M0.0', name: 'Fin_Tiempo_YD', dataType: 'Bool', comment: 'Fin temporizacion TON_YD (5.0 s)' }
  ],
  rungs: [
    {
      id: 'yd_r1',
      number: 1,
      comment: 'Contactor de Línea (-KM1) con autoenclavamiento y seguridades',
      branches: [
        { id: 'yd_b1', contacts: [{ id: 'yd_c1', type: 'NO', address: '%I0.0' }] },
        { id: 'yd_b2', contacts: [{ id: 'yd_c2', type: 'NO', address: '%Q0.0' }] }
      ],
      seriesContacts: [
        { id: 'yd_c3', type: 'NC', address: '%I0.1' },
        { id: 'yd_c4', type: 'NC', address: '%I0.2' }
      ],
      coils: [{ id: 'yd_q1', type: 'OUT', address: '%Q0.0' }]
    },
    {
      id: 'yd_r2',
      number: 2,
      comment: 'Temporizador de Arranque Estrella-Triángulo TON_YD (5.0 s)',
      branches: [{ id: 'yd_b3', contacts: [{ id: 'yd_c5', type: 'NO', address: '%Q0.0' }] }],
      seriesContacts: [],
      timer: { id: 'yd_tm1', name: 'TON_YD', type: 'TON', presetSeconds: 5.0 },
      coils: [{ id: 'yd_q2', type: 'OUT', address: '%M0.0' }]
    },
    {
      id: 'yd_r3',
      number: 3,
      comment: 'Contactor Estrella (-KM3) activo durante los primeros 5 segundos',
      branches: [{ id: 'yd_b4', contacts: [{ id: 'yd_c6', type: 'NO', address: '%Q0.0' }] }],
      seriesContacts: [
        { id: 'yd_c7', type: 'NC', address: '%M0.0' },
        { id: 'yd_c8', type: 'NC', address: '%Q0.2' }
      ],
      coils: [{ id: 'yd_q3', type: 'OUT', address: '%Q0.1' }]
    },
    {
      id: 'yd_r4',
      number: 4,
      comment: 'Contactor Triángulo (-KM2) y Piloto Régimen (-H2) tras TON_YD',
      branches: [{ id: 'yd_b5', contacts: [{ id: 'yd_c9', type: 'NO', address: '%Q0.0' }] }],
      seriesContacts: [
        { id: 'yd_c10', type: 'NO', address: '%M0.0' },
        { id: 'yd_c11', type: 'NC', address: '%Q0.1' }
      ],
      coils: [
        { id: 'yd_q4', type: 'OUT', address: '%Q0.2' },
        { id: 'yd_q5', type: 'OUT', address: '%Q0.3' }
      ]
    }
  ],
  sclCode: `// Nivel 3: Arranque Estrella - Triangulo (Y-Delta) con TON 5s — OB1
// Autor: Simon Barrera Ruiz

IF ("Pulsador_Marcha_S1" OR "Contactor_Linea_KM1") AND NOT "Pulsador_Paro_S0" AND NOT "Rele_Termico_F1" THEN
    "Contactor_Linea_KM1" := TRUE;
ELSE
    "Contactor_Linea_KM1" := FALSE;
END_IF;

// Temporizador de transicion Estrella -> Triangulo (5 segundos)
"TON_YD"(IN := "Contactor_Linea_KM1", PT := T#5s);
"Fin_Tiempo_YD" := TON_YD.Q;

// Enclavamiento mutuo entre Estrella (-KM3) y Triangulo (-KM2)
"Contactor_Estrella_KM3" := "Contactor_Linea_KM1" AND NOT "Fin_Tiempo_YD" AND NOT "Contactor_Triangulo_KM2";
"Contactor_Triangulo_KM2" := "Contactor_Linea_KM1" AND "Fin_Tiempo_YD" AND NOT "Contactor_Estrella_KM3";
"Piloto_Regimen_H2" := "Contactor_Triangulo_KM2";
`,
  grafcetSteps: [
    { id: 0, name: 'Reposo', isInitial: true, actionTag: '', actionLabel: 'Motor detenido (arranque Y-Δ listo)' },
    { id: 1, name: 'Estrella', isInitial: false, actionTag: '%Q0.1', actionLabel: 'Arranque Estrella (-KM1 + -KM3, T=5s)' },
    { id: 2, name: 'Triang.', isInitial: false, actionTag: '%Q0.2', actionLabel: 'Marcha Triángulo (-KM1 + -KM2 + -H2)' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND NOT %I0.1 AND NOT %I0.2', label: 'Marcha (-S1)' },
    { id: 2, fromStep: 1, toStep: 2, condition: 'TON_YD.Q OR %M0.0 OR %I0.3', label: 'Fin 5 s (TON_YD.Q)' },
    { id: 3, fromStep: 2, toStep: 0, condition: '%I0.1 OR %I0.2', label: 'Paro (-S0) / Térmico (-F1)' },
    { id: 4, fromStep: 1, toStep: 0, condition: '%I0.1 OR %I0.2', label: 'Paro en arranque (-S0)' }
  ]
};

// ============================================================================
// NIVEL 4: BOMBA DE AGUA Y CONTROL DE NIVEL CON BOYAS (PLANTA 2D)
// ============================================================================
export const WATER_TANK_PUMP_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: '4. Bomba de Agua y Control de Nivel',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.1',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA (FUERZA) ----------------
    { id: 'pow_1', type: 'power_3phase_pe', tag: '3L+PE', x: 6, y: 2, rotation: 0 },
    { id: 'brk_1', type: 'breaker_3p', tag: '-Q1', x: 6, y: 6, rotation: 0, state: { isOpen: false } },
    { id: 'cnt_1', type: 'contactor_power_3p', tag: '-KM1', x: 6, y: 12, rotation: 0 },
    { id: 'thm_1', type: 'thermal_relay_power', tag: '-F1', x: 6, y: 18, rotation: 0, state: { isOpen: false } },
    { id: 'mot_1', type: 'motor_3phase', tag: '-M1', x: 6, y: 24, rotation: 0 },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'pow_ctrl_ln', type: 'power_ln', tag: 'L-N', x: 18, y: 2, rotation: 0 },
    { id: 'brk_ctrl', type: 'breaker_1p_n', tag: '-Q2', x: 18, y: 5, rotation: 0, state: { isOpen: false } },
    { id: 'thm_nc', type: 'thermal_contact_nc', tag: '-F1', x: 18, y: 11, rotation: 0 },
    { id: 'btn_stop', type: 'button_nc', tag: '-S0', x: 18, y: 15, rotation: 0, state: { isActuated: false } },
    // Boya Nivel Máximo NC (abre al llenarse el depósito)
    { id: 'float_max_nc', type: 'limit_switch_nc', tag: '-B_MAX', x: 18, y: 19, rotation: 0, state: { isActuated: false } },
    // Boya Nivel Mínimo NA (inicia llenado automático)
    { id: 'float_min_no', type: 'limit_switch_no', tag: '-B_MIN', x: 18, y: 24, rotation: 0, state: { isActuated: false } },
    // Pulsador de Marcha Manual
    { id: 'btn_start', type: 'button_no', tag: '-S1', x: 24, y: 24, rotation: 0, state: { isActuated: false } },
    // Retención / Memoria de Bombeo (-KM1 13-14)
    { id: 'aux_latch', type: 'contact_no', tag: '-KM1', x: 29, y: 24, rotation: 0 },
    // Bobina de la Bomba (-KM1 A1-A2)
    { id: 'coil_km1', type: 'coil_contactor', tag: '-KM1', x: 18, y: 29, rotation: 0 },
    // Piloto Verde (Bomba en Marcha)
    { id: 'pilot_pump', type: 'pilot_light_green', tag: '-H1', x: 24, y: 29, rotation: 0 },
    // Piloto Rojo (Depósito Lleno / Espera) vía NC de KM1
    { id: 'aux_km1_nc', type: 'contact_nc', tag: '-KM1', x: 34, y: 24, rotation: 0 },
    { id: 'pilot_full', type: 'pilot_light_red', tag: '-H2', x: 34, y: 29, rotation: 0 },
    // Piloto Ámbar (Alarma Sobrecarga Térmica F1)
    { id: 'thm_no', type: 'thermal_contact_no', tag: '-F1', x: 39, y: 24, rotation: 0 },
    { id: 'pilot_alarm', type: 'pilot_light_yellow', tag: '-H3', x: 39, y: 29, rotation: 0 }
  ],
  wires: [
    // ---------------- POTENCIA ----------------
    { id: 'w_pmp_p1', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase1' },
    { id: 'w_pmp_p2', fromX: 8, fromY: 4, toX: 8, toY: 6, wireType: 'phase2' },
    { id: 'w_pmp_p3', fromX: 9, fromY: 4, toX: 9, toY: 6, wireType: 'phase3' },
    { id: 'w_pmp_p4', fromX: 7, fromY: 10, toX: 7, toY: 12, wireType: 'phase1' },
    { id: 'w_pmp_p5', fromX: 8, fromY: 10, toX: 8, toY: 12, wireType: 'phase2' },
    { id: 'w_pmp_p6', fromX: 9, fromY: 10, toX: 9, toY: 12, wireType: 'phase3' },
    { id: 'w_pmp_p7', fromX: 7, fromY: 16, toX: 7, toY: 18, wireType: 'phase1' },
    { id: 'w_pmp_p8', fromX: 8, fromY: 16, toX: 8, toY: 18, wireType: 'phase2' },
    { id: 'w_pmp_p9', fromX: 9, fromY: 16, toX: 9, toY: 18, wireType: 'phase3' },
    { id: 'w_pmp_p10', fromX: 7, fromY: 22, toX: 7, toY: 24, wireType: 'phase1' },
    { id: 'w_pmp_p11', fromX: 8, fromY: 22, toX: 8, toY: 24, wireType: 'phase2' },
    { id: 'w_pmp_p12', fromX: 9, fromY: 22, toX: 9, toY: 24, wireType: 'phase3' },
    { id: 'w_pmp_pe', fromX: 10, fromY: 4, toX: 10, toY: 26, wireType: 'pe' },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'w_pmp_c1', fromX: 19, fromY: 4, toX: 19, toY: 5, wireType: 'control' },
    { id: 'w_pmp_c2', fromX: 19, fromY: 9, toX: 19, toY: 10, wireType: 'control' },
    { id: 'w_pmp_c3', fromX: 19, fromY: 10, toX: 19, toY: 11, wireType: 'control' },
    // Derivación aguas arriba de -F1 NC hacia contacto alarma térmica -F1 NA (97-98)
    { id: 'w_pmp_c4', fromX: 19, fromY: 10, toX: 40, toY: 10, wireType: 'control' },
    { id: 'w_pmp_c5', fromX: 40, fromY: 10, toX: 40, toY: 24, wireType: 'control' },

    // Serie de seguridad: -F1 NC (96 at y=14) -> -S0 NC (1 at y=15, 2 at y=18) -> -B_MAX NC (21 at y=19)
    { id: 'w_pmp_c6', fromX: 19, fromY: 14, toX: 19, toY: 15, wireType: 'control' },
    { id: 'w_pmp_c7', fromX: 19, fromY: 18, toX: 19, toY: 19, wireType: 'control' },

    // Alimentación a piloto Depósito Lleno / Espera aguas arriba de -B_MAX (nodo 19,18)
    { id: 'w_pmp_c8', fromX: 19, fromY: 18, toX: 35, toY: 18, wireType: 'control' },
    { id: 'w_pmp_c9', fromX: 35, fromY: 18, toX: 35, toY: 24, wireType: 'control' },

    // Salida de -B_MAX (22 at y=22) -> bus de arranque y=23 (segmentado: 19 -> 25 -> 30)
    { id: 'w_pmp_c10', fromX: 19, fromY: 22, toX: 19, toY: 23, wireType: 'control' },
    { id: 'w_pmp_c11', fromX: 19, fromY: 23, toX: 19, toY: 24, wireType: 'control' },
    { id: 'w_pmp_c12', fromX: 19, fromY: 23, toX: 25, toY: 23, wireType: 'control' },
    { id: 'w_pmp_c13', fromX: 25, fromY: 23, toX: 25, toY: 24, wireType: 'control' },
    { id: 'w_pmp_c14', fromX: 25, fromY: 23, toX: 30, toY: 23, wireType: 'control' },
    { id: 'w_pmp_c15', fromX: 30, fromY: 23, toX: 30, toY: 24, wireType: 'control' },

    // Retorno paralelo de -B_MIN, -S1 y Retención -KM1 -> bus y=28 -> Bobina -KM1 y Piloto -H1
    { id: 'w_pmp_c16', fromX: 19, fromY: 27, toX: 19, toY: 28, wireType: 'control' },
    { id: 'w_pmp_c17', fromX: 25, fromY: 27, toX: 25, toY: 28, wireType: 'control' },
    { id: 'w_pmp_c18', fromX: 30, fromY: 27, toX: 30, toY: 28, wireType: 'control' },
    { id: 'w_pmp_c19', fromX: 30, fromY: 28, toX: 25, toY: 28, wireType: 'control' },
    { id: 'w_pmp_c20', fromX: 25, fromY: 28, toX: 19, toY: 28, wireType: 'control' },
    { id: 'w_pmp_c21', fromX: 19, fromY: 28, toX: 19, toY: 29, wireType: 'control' },
    { id: 'w_pmp_c22', fromX: 25, fromY: 28, toX: 25, toY: 29, wireType: 'control' },

    // Piloto Rojo (-H2) gobernado por -KM1 NC y Piloto Ámbar (-H3) por -F1 NA
    { id: 'w_pmp_c23', fromX: 35, fromY: 27, toX: 35, toY: 29, wireType: 'control' },
    { id: 'w_pmp_c24', fromX: 40, fromY: 27, toX: 40, toY: 29, wireType: 'control' },

    // Neutro N desde -Q2 segmentado limpiamente a cada carga (y=34)
    { id: 'w_pmp_n0', fromX: 20, fromY: 4, toX: 20, toY: 5, wireType: 'neutral' },
    { id: 'w_pmp_n1', fromX: 20, fromY: 9, toX: 44, toY: 9, wireType: 'neutral' },
    { id: 'w_pmp_n2', fromX: 44, fromY: 9, toX: 44, toY: 34, wireType: 'neutral' },
    { id: 'w_pmp_n3', fromX: 44, fromY: 34, toX: 40, toY: 34, wireType: 'neutral' },
    { id: 'w_pmp_n4', fromX: 40, fromY: 34, toX: 35, toY: 34, wireType: 'neutral' },
    { id: 'w_pmp_n5', fromX: 35, fromY: 34, toX: 25, toY: 34, wireType: 'neutral' },
    { id: 'w_pmp_n6', fromX: 25, fromY: 34, toX: 19, toY: 34, wireType: 'neutral' },
    { id: 'w_pmp_n7', fromX: 19, fromY: 32, toX: 19, toY: 34, wireType: 'neutral' },
    { id: 'w_pmp_n8', fromX: 25, fromY: 32, toX: 25, toY: 34, wireType: 'neutral' },
    { id: 'w_pmp_n9', fromX: 35, fromY: 32, toX: 35, toY: 34, wireType: 'neutral' },
    { id: 'w_pmp_n10', fromX: 40, fromY: 32, toX: 40, toY: 34, wireType: 'neutral' }
  ],
  junctions: [
    { id: 'j_pmp_1', x: 19, y: 10 },
    { id: 'j_pmp_2', x: 19, y: 18 },
    { id: 'j_pmp_3', x: 19, y: 23 },
    { id: 'j_pmp_4', x: 25, y: 23 },
    { id: 'j_pmp_5', x: 19, y: 28 },
    { id: 'j_pmp_6', x: 25, y: 28 },
    { id: 'j_pmp_n1', x: 25, y: 34 },
    { id: 'j_pmp_n2', x: 35, y: 34 },
    { id: 'j_pmp_n3', x: 40, y: 34 }
  ]
};

export const WATER_TANK_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Bomba_Nivel',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Marcha_Manual_S1', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador NA marcha manual bomba' },
    { address: '%I0.1', name: 'Paro_Manual_S0', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador paro de seguridad' },
    { address: '%I0.2', name: 'Rele_Termico_F1', dataType: 'Bool', schematicTag: '-F1', comment: 'Proteccion termica electrobomba' },
    { address: '%I0.3', name: 'Boya_Nivel_Min', dataType: 'Bool', schematicTag: '-B_MIN', comment: 'Sensor boya nivel minimo (inicia bombeo)' },
    { address: '%I0.4', name: 'Boya_Nivel_Max', dataType: 'Bool', schematicTag: '-B_MAX', comment: 'Sensor boya nivel maximo (detiene bomba)' },
    { address: '%Q0.0', name: 'Bomba_Agua_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Contactor motor bomba de agua' },
    { address: '%Q0.1', name: 'Piloto_Bombeo_H1', dataType: 'Bool', schematicTag: '-H1', comment: 'Piloto verde bomba en servicio' },
    { address: '%Q0.2', name: 'Piloto_Lleno_H2', dataType: 'Bool', schematicTag: '-H2', comment: 'Piloto rojo tanque lleno / espera' },
    { address: '%Q0.3', name: 'Alarma_Termica_H3', dataType: 'Bool', schematicTag: '-H3', comment: 'Piloto ambar falla termica' }
  ],
  rungs: [
    {
      id: 'wt_r1',
      number: 1,
      comment: 'Arranque Bomba por Nivel Mínimo (-B_MIN) o Marcha (-S1) con paro en Nivel Máximo (-B_MAX)',
      branches: [
        { id: 'wt_b1', contacts: [{ id: 'wt_c1', type: 'NO', address: '%I0.0' }] },
        { id: 'wt_b2', contacts: [{ id: 'wt_c2', type: 'NO', address: '%I0.3' }] },
        { id: 'wt_b3', contacts: [{ id: 'wt_c3', type: 'NO', address: '%Q0.0' }] }
      ],
      seriesContacts: [
        { id: 'wt_c4', type: 'NC', address: '%I0.1' },
        { id: 'wt_c5', type: 'NC', address: '%I0.4' },
        { id: 'wt_c6', type: 'NC', address: '%I0.2' }
      ],
      coils: [
        { id: 'wt_q1', type: 'OUT', address: '%Q0.0' },
        { id: 'wt_q2', type: 'OUT', address: '%Q0.1' }
      ]
    },
    {
      id: 'wt_r2',
      number: 2,
      comment: 'Señalización Depósito en Espera / Lleno (-H2)',
      branches: [{ id: 'wt_b4', contacts: [{ id: 'wt_c7', type: 'NC', address: '%Q0.0' }] }],
      seriesContacts: [],
      coils: [{ id: 'wt_q3', type: 'OUT', address: '%Q0.2' }]
    },
    {
      id: 'wt_r3',
      number: 3,
      comment: 'Alarma Sobrecarga Térmica de Bomba (-H3)',
      branches: [{ id: 'wt_b5', contacts: [{ id: 'wt_c8', type: 'NO', address: '%I0.2' }] }],
      seriesContacts: [],
      coils: [{ id: 'wt_q4', type: 'OUT', address: '%Q0.3' }]
    }
  ],
  sclCode: `// Nivel 4: Automatismo de Bomba de Agua y Control de Nivel — OB1
// Autor: Simon Barrera Ruiz

IF ("Marcha_Manual_S1" OR "Boya_Nivel_Min" OR "Bomba_Agua_KM1") AND NOT "Paro_Manual_S0" AND NOT "Boya_Nivel_Max" AND NOT "Rele_Termico_F1" THEN
    "Bomba_Agua_KM1" := TRUE;
    "Piloto_Bombeo_H1" := TRUE;
ELSE
    "Bomba_Agua_KM1" := FALSE;
    "Piloto_Bombeo_H1" := FALSE;
END_IF;

"Piloto_Lleno_H2" := NOT "Bomba_Agua_KM1";
"Alarma_Termica_H3" := "Rele_Termico_F1";
`,
  grafcetSteps: [
    { id: 0, name: 'Espera', isInitial: true, actionTag: '%Q0.2', actionLabel: 'Tanque lleno / espera (Piloto Rojo -H2)' },
    { id: 1, name: 'Bombeo', isInitial: false, actionTag: '%Q0.0', actionLabel: 'Electrobomba activa (-KM1 + Piloto -H1)' },
    { id: 2, name: 'Alarma', isInitial: false, actionTag: '%Q0.3', actionLabel: 'Disparo térmico bomba (Piloto Ámbar -H3)' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '(%I0.0 OR %I0.3) AND NOT %I0.1 AND NOT %I0.4 AND NOT %I0.2', label: 'Nivel Mín (-B_MIN) o Marcha (-S1)' },
    { id: 2, fromStep: 1, toStep: 0, condition: '%I0.4 OR %I0.1', label: 'Nivel Máx (-B_MAX) o Paro (-S0)' },
    { id: 3, fromStep: 1, toStep: 2, condition: '%I0.2', label: 'Falla Térmica (-F1)' },
    { id: 4, fromStep: 2, toStep: 0, condition: 'NOT %I0.2', label: 'Rearme Térmico (-F1 OK)' }
  ]
};

// ============================================================================
// NIVEL 5: CONTROL MOTOR TRIFÁSICO CON PLC SIEMENS S7-1200 (TIA + CAD)
// ============================================================================
export const PLC_S71200_STARTER_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: '5. Control Motor Trifásico con S7-1200',
    project: 'Co-Simulación CADe_SIMU + TIA Portal',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.1',
    company: 'Sistemas de Automatización'
  },
  components: [
    // Fuerza Trifásica
    { id: 'plc_pow3', type: 'power_3phase_pe', tag: '3L+PE', x: 4, y: 2, rotation: 0 },
    { id: 'plc_q1', type: 'breaker_3p', tag: '-Q1', x: 4, y: 6, rotation: 0, state: { isOpen: false } },
    { id: 'plc_km1', type: 'contactor_power_3p', tag: '-KM1', x: 4, y: 12, rotation: 0 },
    { id: 'plc_f1', type: 'thermal_relay_power', tag: '-F1', x: 4, y: 18, rotation: 0, state: { isOpen: false } },
    { id: 'plc_m1', type: 'motor_3phase', tag: '-M1', x: 4, y: 24, rotation: 0 },

    // Alimentación 24V DC y Entradas espaciadas (cero solapamiento de tags/pills)
    { id: 'plc_dc', type: 'power_dc', tag: '24VDC', x: 15, y: 2, rotation: 0 },
    { id: 'btn_start', type: 'button_no', tag: '-S1', plcAddress: '%I0.0', x: 18, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'btn_stop', type: 'button_no', tag: '-S0', plcAddress: '%I0.1', x: 24, y: 6, rotation: 0, state: { isActuated: false } },

    // CPU Siemens S7-1200 1214C
    { id: 'cpu_s7', type: 'plc_cpu_s71200', tag: 'PLC1', x: 17, y: 12, rotation: 0 },

    // Actuadores espaciados en x=18 y x=24 para evitar solapamiento visual de etiquetas
    { id: 'coil_km1', type: 'coil_contactor', tag: '-KM1', plcAddress: '%Q0.0', x: 18, y: 21, rotation: 0 },
    { id: 'pilot_run', type: 'pilot_light_green', tag: '-H1', plcAddress: '%Q0.1', x: 24, y: 21, rotation: 0 }
  ],
  wires: [
    // Fuerza Trifásica
    { id: 'wp_1', fromX: 5, fromY: 4, toX: 5, toY: 6, wireType: 'phase1' },
    { id: 'wp_2', fromX: 6, fromY: 4, toX: 6, toY: 6, wireType: 'phase2' },
    { id: 'wp_3', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase3' },
    { id: 'wp_4', fromX: 5, fromY: 10, toX: 5, toY: 12, wireType: 'phase1' },
    { id: 'wp_5', fromX: 6, fromY: 10, toX: 6, toY: 12, wireType: 'phase2' },
    { id: 'wp_6', fromX: 7, fromY: 10, toX: 7, toY: 12, wireType: 'phase3' },
    { id: 'wp_7', fromX: 5, fromY: 16, toX: 5, toY: 18, wireType: 'phase1' },
    { id: 'wp_8', fromX: 6, fromY: 16, toX: 6, toY: 18, wireType: 'phase2' },
    { id: 'wp_9', fromX: 7, fromY: 16, toX: 7, toY: 18, wireType: 'phase3' },
    { id: 'wp_10', fromX: 5, fromY: 22, toX: 5, toY: 24, wireType: 'phase1' },
    { id: 'wp_11', fromX: 6, fromY: 22, toX: 6, toY: 24, wireType: 'phase2' },
    { id: 'wp_12', fromX: 7, fromY: 22, toX: 7, toY: 24, wireType: 'phase3' },
    { id: 'wp_pe', fromX: 8, fromY: 4, toX: 8, toY: 26, wireType: 'pe' },

    // Bus +24V DC segmentado limpiamente (desde POS=16,4)
    { id: 'wdc_1', fromX: 16, fromY: 4, toX: 16, toY: 5, wireType: 'dc_pos' },
    { id: 'wdc_2', fromX: 16, fromY: 5, toX: 16, toY: 12, wireType: 'dc_pos' },
    { id: 'wdc_3', fromX: 16, fromY: 12, toX: 16, toY: 18, wireType: 'dc_pos' },
    { id: 'wdc_4', fromX: 16, fromY: 5, toX: 19, toY: 5, wireType: 'dc_pos' },
    { id: 'wdc_5', fromX: 19, fromY: 5, toX: 25, toY: 5, wireType: 'dc_pos' },
    { id: 'wdc_6', fromX: 19, fromY: 5, toX: 19, toY: 6, wireType: 'dc_pos' },
    { id: 'wdc_7', fromX: 25, fromY: 5, toX: 25, toY: 6, wireType: 'dc_pos' },
    { id: 'wdc_8', fromX: 16, fromY: 12, toX: 18, toY: 12, wireType: 'dc_pos' },
    { id: 'wdc_9', fromX: 16, fromY: 18, toX: 18, toY: 18, wireType: 'dc_pos' },

    // Entradas I0.0 (-S1) y I0.1 (-S0) hacia bornas PLC
    { id: 'wi_0a', fromX: 19, fromY: 9, toX: 19, toY: 10, wireType: 'control' },
    { id: 'wi_0b', fromX: 19, fromY: 10, toX: 20, toY: 10, wireType: 'control' },
    { id: 'wi_0c', fromX: 20, fromY: 10, toX: 20, toY: 12, wireType: 'control' },
    { id: 'wi_1a', fromX: 25, fromY: 9, toX: 25, toY: 10, wireType: 'control' },
    { id: 'wi_1b', fromX: 25, fromY: 10, toX: 21, toY: 10, wireType: 'control' },
    { id: 'wi_1c', fromX: 21, fromY: 10, toX: 21, toY: 12, wireType: 'control' },

    // Salidas Q0.0 (-KM1) y Q0.1 (-H1)
    { id: 'wq_0a', fromX: 20, fromY: 18, toX: 20, toY: 19, wireType: 'control' },
    { id: 'wq_0b', fromX: 20, fromY: 19, toX: 19, toY: 19, wireType: 'control' },
    { id: 'wq_0c', fromX: 19, fromY: 19, toX: 19, toY: 21, wireType: 'control' },
    { id: 'wq_1a', fromX: 21, fromY: 18, toX: 21, toY: 19, wireType: 'control' },
    { id: 'wq_1b', fromX: 21, fromY: 19, toX: 25, toY: 19, wireType: 'control' },
    { id: 'wq_1c', fromX: 25, fromY: 19, toX: 25, toY: 21, wireType: 'control' },

    // Retorno 0V DC (NEG=17,4) a borne M (19,12) y bobinas (y=26)
    { id: 'wn_0', fromX: 17, fromY: 4, toX: 30, toY: 4, wireType: 'dc_neg' },
    { id: 'wn_1', fromX: 30, fromY: 4, toX: 30, toY: 26, wireType: 'dc_neg' },
    { id: 'wn_2', fromX: 30, fromY: 26, toX: 25, toY: 26, wireType: 'dc_neg' },
    { id: 'wn_3', fromX: 25, fromY: 26, toX: 19, toY: 26, wireType: 'dc_neg' },
    { id: 'wn_4', fromX: 19, fromY: 24, toX: 19, toY: 26, wireType: 'dc_neg' },
    { id: 'wn_5', fromX: 25, fromY: 24, toX: 25, toY: 26, wireType: 'dc_neg' },
    { id: 'wn_m1', fromX: 17, fromY: 4, toX: 17, toY: 11, wireType: 'dc_neg' },
    { id: 'wn_m2', fromX: 17, fromY: 11, toX: 19, toY: 11, wireType: 'dc_neg' },
    { id: 'wn_m3', fromX: 19, fromY: 11, toX: 19, toY: 12, wireType: 'dc_neg' }
  ],
  junctions: [
    { id: 'jp_1', x: 16, y: 5 },
    { id: 'jp_2', x: 19, y: 5 },
    { id: 'jp_3', x: 16, y: 12 },
    { id: 'jp_4', x: 17, y: 4 },
    { id: 'jp_5', x: 25, y: 26 }
  ]
};

export const PLC_S71200_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Control_Motor_S71200',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Boton_Marcha', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador NA de arranque' },
    { address: '%I0.1', name: 'Boton_Paro', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador de parada' },
    { address: '%I0.2', name: 'Rele_Termico', dataType: 'Bool', schematicTag: '-F1', comment: 'Proteccion termica motor' },
    { address: '%Q0.0', name: 'Contactor_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Bobina motor principal' },
    { address: '%Q0.1', name: 'Piloto_Marcha', dataType: 'Bool', schematicTag: '-H1', comment: 'Piloto verde marcha' },
    { address: '%M0.0', name: 'Ciclo_Activo', dataType: 'Bool', comment: 'Supervision marcha estable TON_1' }
  ],
  rungs: [
    {
      id: 's7_r1',
      number: 1,
      comment: 'Marcha y Autoenclavamiento Motor Trifásico (-KM1) + Piloto (-H1)',
      branches: [
        { id: 's7_b1', contacts: [{ id: 's7_c1', type: 'NO', address: '%I0.0' }] },
        { id: 's7_b2', contacts: [{ id: 's7_c2', type: 'NO', address: '%Q0.0' }] }
      ],
      seriesContacts: [
        { id: 's7_c3', type: 'NC', address: '%I0.1' },
        { id: 's7_c4', type: 'NC', address: '%I0.2' }
      ],
      coils: [
        { id: 's7_q1', type: 'OUT', address: '%Q0.0' },
        { id: 's7_q2', type: 'OUT', address: '%Q0.1' }
      ]
    },
    {
      id: 's7_r2',
      number: 2,
      comment: 'Temporizador de Supervisión en Régimen TON_1 (3.0 s)',
      branches: [{ id: 's7_b3', contacts: [{ id: 's7_c5', type: 'NO', address: '%Q0.0' }] }],
      seriesContacts: [],
      timer: { id: 's7_tm1', name: 'TON_1', type: 'TON', presetSeconds: 3.0 },
      coils: [{ id: 's7_q3', type: 'OUT', address: '%M0.0' }]
    }
  ],
  sclCode: `// Nivel 5: Control Motor Trifasico con Siemens S7-1200 — OB1
// Autor: Simon Barrera Ruiz

IF ("Boton_Marcha" OR "Contactor_KM1") AND NOT "Boton_Paro" AND NOT "Rele_Termico" THEN
    "Contactor_KM1" := TRUE;
    "Piloto_Marcha" := TRUE;
ELSE
    "Contactor_KM1" := FALSE;
    "Piloto_Marcha" := FALSE;
END_IF;

// Temporizador de confirmacion de marcha estable (3 segundos)
"TON_1"(IN := "Contactor_KM1", PT := T#3s);
"Ciclo_Activo" := TON_1.Q;
`,
  grafcetSteps: [
    { id: 0, name: 'Reposo', isInitial: true, actionTag: '', actionLabel: 'PLC S7-1200 en espera de Marcha (-S1)' },
    { id: 1, name: 'Motor ON', isInitial: false, actionTag: '%Q0.0', actionLabel: 'Activar Contactor -KM1 y Piloto -H1' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND NOT %I0.1 AND NOT %I0.2', label: 'Marcha (%I0.0)' },
    { id: 2, fromStep: 1, toStep: 0, condition: '%I0.1 OR %I0.2', label: 'Paro (%I0.1) / Térmico (%I0.2)' }
  ]
};

// ============================================================================
// NIVEL 6: ELECTRONEUMÁTICA SECUENCIA A+ / A- CON S7-1200 (NEUMÁTICA)
// ============================================================================
export const PNEUMATIC_PLC_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: '6. Electroneumática Secuencia A+ / A- (S7-1200)',
    project: 'Electroneumática Industrial TIA Portal',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.1',
    company: 'Sistemas de Automatización'
  },
  components: [
    { id: 'pn_dc', type: 'power_dc', tag: '24VDC', x: 4, y: 2, rotation: 0 },
    { id: 'btn_start', type: 'button_no', tag: '-S1', plcAddress: '%I0.0', x: 8, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'btn_stop', type: 'button_no', tag: '-S0', plcAddress: '%I0.1', x: 14, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'pn_a0', type: 'limit_switch_no', tag: 'a0', plcAddress: '%I0.3', x: 20, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'pn_a1', type: 'limit_switch_no', tag: 'a1', plcAddress: '%I0.4', x: 26, y: 6, rotation: 0, state: { isActuated: false } },

    { id: 'pn_cpu', type: 'plc_cpu_s71200', tag: 'PLC1', x: 12, y: 13, rotation: 0 },

    { id: 'pilot_run', type: 'pilot_light_green', tag: '-H1', plcAddress: '%Q0.1', x: 10, y: 22, rotation: 0 },
    { id: 'pn_valve', type: 'solenoid_valve_5_2', tag: '-A', x: 18, y: 22, rotation: 0 },
    { id: 'pn_cyl', type: 'pneumatic_cylinder_da', tag: '-A', x: 25, y: 14, rotation: 0, state: { pistonPos: 0 } }
  ],
  wires: [
    // Bus +24V DC segmentado limpiamente (POS=5,4)
    { id: 'pn_p0', fromX: 5, fromY: 4, toX: 5, toY: 5, wireType: 'dc_pos' },
    { id: 'pn_p1', fromX: 5, fromY: 5, toX: 5, toY: 13, wireType: 'dc_pos' },
    { id: 'pn_p2', fromX: 5, fromY: 13, toX: 5, toY: 19, wireType: 'dc_pos' },
    { id: 'pn_p3', fromX: 5, fromY: 13, toX: 13, toY: 13, wireType: 'dc_pos' },
    { id: 'pn_p4', fromX: 5, fromY: 19, toX: 13, toY: 19, wireType: 'dc_pos' },
    { id: 'pn_p5', fromX: 5, fromY: 5, toX: 9, toY: 5, wireType: 'dc_pos' },
    { id: 'pn_p6', fromX: 9, fromY: 5, toX: 15, toY: 5, wireType: 'dc_pos' },
    { id: 'pn_p7', fromX: 15, fromY: 5, toX: 21, toY: 5, wireType: 'dc_pos' },
    { id: 'pn_p8', fromX: 21, fromY: 5, toX: 27, toY: 5, wireType: 'dc_pos' },
    { id: 'pn_p9', fromX: 9, fromY: 5, toX: 9, toY: 6, wireType: 'dc_pos' },
    { id: 'pn_p10', fromX: 15, fromY: 5, toX: 15, toY: 6, wireType: 'dc_pos' },
    { id: 'pn_p11', fromX: 21, fromY: 5, toX: 21, toY: 6, wireType: 'dc_pos' },
    { id: 'pn_p12', fromX: 27, fromY: 5, toX: 27, toY: 6, wireType: 'dc_pos' },

    // Entradas S1(I0), S0(I1), a0(I3), a1(I4) sin cruces ni solapes
    { id: 'pn_i0a', fromX: 9, fromY: 9, toX: 9, toY: 11, wireType: 'control' },
    { id: 'pn_i0b', fromX: 9, fromY: 11, toX: 15, toY: 11, wireType: 'control' },
    { id: 'pn_i0c', fromX: 15, fromY: 11, toX: 15, toY: 13, wireType: 'control' },

    { id: 'pn_i1a', fromX: 15, fromY: 9, toX: 15, toY: 10, wireType: 'control' },
    { id: 'pn_i1b', fromX: 15, fromY: 10, toX: 16, toY: 10, wireType: 'control' },
    { id: 'pn_i1c', fromX: 16, fromY: 10, toX: 16, toY: 13, wireType: 'control' },

    { id: 'pn_i3a', fromX: 21, fromY: 9, toX: 21, toY: 10, wireType: 'control' },
    { id: 'pn_i3b', fromX: 21, fromY: 10, toX: 18, toY: 10, wireType: 'control' },
    { id: 'pn_i3c', fromX: 18, fromY: 10, toX: 18, toY: 13, wireType: 'control' },

    { id: 'pn_i4a', fromX: 27, fromY: 9, toX: 27, toY: 11, wireType: 'control' },
    { id: 'pn_i4b', fromX: 27, fromY: 11, toX: 19, toY: 11, wireType: 'control' },
    { id: 'pn_i4c', fromX: 19, fromY: 11, toX: 19, toY: 13, wireType: 'control' },

    // Salidas Q1(-H1), Q2(Y1), Q3(Y2)
    { id: 'pn_q1a', fromX: 16, fromY: 19, toX: 16, toY: 20, wireType: 'control' },
    { id: 'pn_q1b', fromX: 16, fromY: 20, toX: 11, toY: 20, wireType: 'control' },
    { id: 'pn_q1c', fromX: 11, fromY: 20, toX: 11, toY: 22, wireType: 'control' },

    { id: 'pn_q2a', fromX: 17, fromY: 19, toX: 17, toY: 21, wireType: 'control' },
    { id: 'pn_q2b', fromX: 17, fromY: 21, toX: 19, toY: 21, wireType: 'control' },
    { id: 'pn_q2c', fromX: 19, fromY: 21, toX: 19, toY: 22, wireType: 'control' },

    { id: 'pn_q3a', fromX: 18, fromY: 19, toX: 18, toY: 20, wireType: 'control' },
    { id: 'pn_q3b', fromX: 18, fromY: 20, toX: 23, toY: 20, wireType: 'control' },
    { id: 'pn_q3c', fromX: 23, fromY: 20, toX: 23, toY: 22, wireType: 'control' },

    // Retorno 0V DC (NEG=6,4) a PLC M (14,13) y cargas inferiores (y=27)
    { id: 'pn_n0', fromX: 6, fromY: 4, toX: 34, toY: 4, wireType: 'dc_neg' },
    { id: 'pn_n1', fromX: 34, fromY: 4, toX: 34, toY: 27, wireType: 'dc_neg' },
    { id: 'pn_n2', fromX: 34, fromY: 27, toX: 23, toY: 27, wireType: 'dc_neg' },
    { id: 'pn_n3', fromX: 23, fromY: 27, toX: 19, toY: 27, wireType: 'dc_neg' },
    { id: 'pn_n4', fromX: 19, fromY: 27, toX: 11, toY: 27, wireType: 'dc_neg' },
    { id: 'pn_n5', fromX: 11, fromY: 25, toX: 11, toY: 27, wireType: 'dc_neg' },
    { id: 'pn_n6', fromX: 19, fromY: 25, toX: 19, toY: 27, wireType: 'dc_neg' },
    { id: 'pn_n7', fromX: 23, fromY: 25, toX: 23, toY: 27, wireType: 'dc_neg' },
    { id: 'pn_m1', fromX: 6, fromY: 4, toX: 6, toY: 12, wireType: 'dc_neg' },
    { id: 'pn_m2', fromX: 6, fromY: 12, toX: 14, toY: 12, wireType: 'dc_neg' },
    { id: 'pn_m3', fromX: 14, fromY: 12, toX: 14, toY: 13, wireType: 'dc_neg' }
  ],
  junctions: [
    { id: 'pn_j1', x: 5, y: 5 },
    { id: 'pn_j2', x: 9, y: 5 },
    { id: 'pn_j3', x: 15, y: 5 },
    { id: 'pn_j4', x: 21, y: 5 },
    { id: 'pn_j5', x: 5, y: 13 },
    { id: 'pn_j6', x: 6, y: 4 },
    { id: 'pn_j7', x: 19, y: 27 },
    { id: 'pn_j8', x: 23, y: 27 }
  ]
};

export const PNEUMATIC_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'Ciclo_Neumatico_OB1',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Boton_Marcha', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador NA inicio secuencia A+/A-' },
    { address: '%I0.1', name: 'Boton_Paro', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador parada de ciclo' },
    { address: '%I0.3', name: 'Sensor_a0', dataType: 'Bool', schematicTag: 'a0', comment: 'Final de carrera cilindro retraido' },
    { address: '%I0.4', name: 'Sensor_a1', dataType: 'Bool', schematicTag: 'a1', comment: 'Final de carrera cilindro extendido' },
    { address: '%Q0.1', name: 'Piloto_Marcha', dataType: 'Bool', schematicTag: '-H1', comment: 'Piloto verde ciclo activo' },
    { address: '%Q0.2', name: 'Electrovalvula_A_Mas', dataType: 'Bool', schematicTag: 'Y1', comment: 'Solenoide avance cilindro A+' },
    { address: '%Q0.3', name: 'Electrovalvula_A_Menos', dataType: 'Bool', schematicTag: 'Y2', comment: 'Solenoide retorno cilindro A-' },
    { address: '%M0.0', name: 'Ciclo_Activo', dataType: 'Bool', comment: 'Memoria de ciclo automatico' }
  ],
  rungs: [
    {
      id: 'pn_r1',
      number: 1,
      comment: 'Arranque y Enclavamiento de Ciclo Automático (%M0.0 / -H1)',
      branches: [
        { id: 'pn_b1', contacts: [{ id: 'pnc_1', type: 'NO', address: '%I0.0' }] },
        { id: 'pn_b2', contacts: [{ id: 'pnc_2', type: 'NO', address: '%M0.0' }] }
      ],
      seriesContacts: [{ id: 'pnc_3', type: 'NC', address: '%I0.1' }],
      coils: [
        { id: 'pnq_0', type: 'OUT', address: '%M0.0' },
        { id: 'pnq_1', type: 'OUT', address: '%Q0.1' }
      ]
    },
    {
      id: 'pn_r2',
      number: 2,
      comment: 'Avance Cilindro A+ (Y1) cuando Ciclo y sensor a0 están activos',
      branches: [{ id: 'pn_b3', contacts: [{ id: 'pnc_4', type: 'NO', address: '%M0.0' }] }],
      seriesContacts: [
        { id: 'pnc_5', type: 'NO', address: '%I0.3' },
        { id: 'pnc_6', type: 'NC', address: '%I0.4' }
      ],
      coils: [
        { id: 'pnq_2', type: 'SET', address: '%Q0.2' },
        { id: 'pnq_3', type: 'RESET', address: '%Q0.3' }
      ]
    },
    {
      id: 'pn_r3',
      number: 3,
      comment: 'Retorno Cilindro A- (Y2) al detectar final de carrera a1',
      branches: [{ id: 'pn_b4', contacts: [{ id: 'pnc_7', type: 'NO', address: '%I0.4' }] }],
      seriesContacts: [],
      coils: [
        { id: 'pnq_4', type: 'RESET', address: '%Q0.2' },
        { id: 'pnq_5', type: 'SET', address: '%Q0.3' }
      ]
    }
  ],
  sclCode: `// Nivel 6: Secuencia Electroneumatica Automatica A+ / A- en SCL — OB1
// Autor: Simon Barrera Ruiz

IF ("Boton_Marcha" OR "Ciclo_Activo") AND NOT "Boton_Paro" THEN
    "Ciclo_Activo" := TRUE;
    "Piloto_Marcha" := TRUE;
ELSE
    "Ciclo_Activo" := FALSE;
    "Piloto_Marcha" := FALSE;
END_IF;

IF "Ciclo_Activo" AND "Sensor_a0" AND NOT "Sensor_a1" THEN
    "Electrovalvula_A_Mas" := TRUE;
    "Electrovalvula_A_Menos" := FALSE;
ELSIF "Sensor_a1" THEN
    "Electrovalvula_A_Mas" := FALSE;
    "Electrovalvula_A_Menos" := TRUE;
END_IF;
`,
  grafcetSteps: [
    { id: 0, name: 'Reposo', isInitial: true, actionTag: '', actionLabel: 'Cilindro -A retraído en posición inicial a0' },
    { id: 1, name: 'Avance A+', isInitial: false, actionTag: '%Q0.2', actionLabel: 'Activar Solenoide Y1 (Extensión A+)' },
    { id: 2, name: 'Retorno A-', isInitial: false, actionTag: '%Q0.3', actionLabel: 'Activar Solenoide Y2 (Retracción A-)' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND %I0.3 AND NOT %I0.1', label: 'Marcha (-S1) · a0' },
    { id: 2, fromStep: 1, toStep: 2, condition: '%I0.4', label: 'Final de carrera a1' },
    { id: 3, fromStep: 2, toStep: 0, condition: '%I0.3', label: 'Retorno completo a0' }
  ]
};

// ============================================================================
// NIVEL 7: PROYECTO BANDA TRANSPORTADORA CLASIFICADORA (S7-1200)
// ============================================================================
export const CONVEYOR_PROJECT_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: '7. Banda Transportadora Clasificadora (S7-1200)',
    project: 'Proyecto Automatización Banda Clasificadora',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.1',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA MOTOR CINTA ----------------
    { id: 'cv_pow3', type: 'power_3phase_pe', tag: '3L+PE', x: 4, y: 2, rotation: 0 },
    { id: 'cv_q1', type: 'breaker_3p', tag: '-Q1', x: 4, y: 6, rotation: 0, state: { isOpen: false } },
    { id: 'cv_km1', type: 'contactor_power_3p', tag: '-KM1', x: 4, y: 12, rotation: 0 },
    { id: 'cv_f1', type: 'thermal_relay_power', tag: '-F1', x: 4, y: 18, rotation: 0, state: { isOpen: false } },
    { id: 'cv_m1', type: 'motor_3phase', tag: '-M1', x: 4, y: 24, rotation: 0 },

    // ---------------- ENTRADAS 24V DC S7-1200 ----------------
    { id: 'cv_dc', type: 'power_dc', tag: '24VDC', x: 12, y: 2, rotation: 0 },
    { id: 'btn_start', type: 'button_no', tag: '-S1', plcAddress: '%I0.0', x: 16, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'btn_stop', type: 'button_no', tag: '-S0', plcAddress: '%I0.1', x: 22, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'cv_b1', type: 'limit_switch_no', tag: '-B1', plcAddress: '%I0.2', x: 28, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'cv_a0', type: 'limit_switch_no', tag: 'a0', plcAddress: '%I0.3', x: 34, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'cv_a1', type: 'limit_switch_no', tag: 'a1', plcAddress: '%I0.4', x: 40, y: 6, rotation: 0, state: { isActuated: false } },

    // ---------------- PLC SIEMENS S7-1200 CPU 1214C ----------------
    { id: 'cv_cpu', type: 'plc_cpu_s71200', tag: 'PLC1', x: 22, y: 14, rotation: 0 },

    // ---------------- SALIDAS Y DESVIADOR NEUMÁTICO ----------------
    { id: 'coil_km1', type: 'coil_contactor', tag: '-KM1', plcAddress: '%Q0.0', x: 16, y: 24, rotation: 0 },
    { id: 'pilot_run', type: 'pilot_light_green', tag: '-H1', plcAddress: '%Q0.1', x: 22, y: 24, rotation: 0 },
    { id: 'cv_valve', type: 'solenoid_valve_5_2', tag: '-A', x: 29, y: 24, rotation: 0 },
    { id: 'cv_cyl', type: 'pneumatic_cylinder_da', tag: '-A', x: 37, y: 15, rotation: 0, state: { pistonPos: 0 } }
  ],
  wires: [
    // Fuerza Trifásica Motor Cinta
    { id: 'cv_p1', fromX: 5, fromY: 4, toX: 5, toY: 6, wireType: 'phase1' },
    { id: 'cv_p2', fromX: 6, fromY: 4, toX: 6, toY: 6, wireType: 'phase2' },
    { id: 'cv_p3', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase3' },
    { id: 'cv_p4', fromX: 5, fromY: 10, toX: 5, toY: 12, wireType: 'phase1' },
    { id: 'cv_p5', fromX: 6, fromY: 10, toX: 6, toY: 12, wireType: 'phase2' },
    { id: 'cv_p6', fromX: 7, fromY: 10, toX: 7, toY: 12, wireType: 'phase3' },
    { id: 'cv_p7', fromX: 5, fromY: 16, toX: 5, toY: 18, wireType: 'phase1' },
    { id: 'cv_p8', fromX: 6, fromY: 16, toX: 6, toY: 18, wireType: 'phase2' },
    { id: 'cv_p9', fromX: 7, fromY: 16, toX: 7, toY: 18, wireType: 'phase3' },
    { id: 'cv_p10', fromX: 5, fromY: 22, toX: 5, toY: 24, wireType: 'phase1' },
    { id: 'cv_p11', fromX: 6, fromY: 22, toX: 6, toY: 24, wireType: 'phase2' },
    { id: 'cv_p12', fromX: 7, fromY: 22, toX: 7, toY: 24, wireType: 'phase3' },
    { id: 'cv_pe', fromX: 8, fromY: 4, toX: 8, toY: 26, wireType: 'pe' },

    // Bus +24V DC segmentado limpiamente (POS=13,4)
    { id: 'cv_dc1', fromX: 13, fromY: 4, toX: 13, toY: 5, wireType: 'dc_pos' },
    { id: 'cv_dc2', fromX: 13, fromY: 5, toX: 13, toY: 14, wireType: 'dc_pos' },
    { id: 'cv_dc3', fromX: 13, fromY: 14, toX: 13, toY: 20, wireType: 'dc_pos' },
    { id: 'cv_dc4', fromX: 13, fromY: 14, toX: 23, toY: 14, wireType: 'dc_pos' },
    { id: 'cv_dc5', fromX: 13, fromY: 20, toX: 23, toY: 20, wireType: 'dc_pos' },
    { id: 'cv_dc6', fromX: 13, fromY: 5, toX: 17, toY: 5, wireType: 'dc_pos' },
    { id: 'cv_dc7', fromX: 17, fromY: 5, toX: 23, toY: 5, wireType: 'dc_pos' },
    { id: 'cv_dc8', fromX: 23, fromY: 5, toX: 29, toY: 5, wireType: 'dc_pos' },
    { id: 'cv_dc9', fromX: 29, fromY: 5, toX: 35, toY: 5, wireType: 'dc_pos' },
    { id: 'cv_dc10', fromX: 35, fromY: 5, toX: 41, toY: 5, wireType: 'dc_pos' },
    { id: 'cv_dc11', fromX: 17, fromY: 5, toX: 17, toY: 6, wireType: 'dc_pos' },
    { id: 'cv_dc12', fromX: 23, fromY: 5, toX: 23, toY: 6, wireType: 'dc_pos' },
    { id: 'cv_dc13', fromX: 29, fromY: 5, toX: 29, toY: 6, wireType: 'dc_pos' },
    { id: 'cv_dc14', fromX: 35, fromY: 5, toX: 35, toY: 6, wireType: 'dc_pos' },
    { id: 'cv_dc15', fromX: 41, fromY: 5, toX: 41, toY: 6, wireType: 'dc_pos' },

    // Entradas I0.0 (-S1), I0.1 (-S0), I0.2 (-B1), I0.3 (a0), I0.4 (a1)
    { id: 'cv_i0a', fromX: 17, fromY: 9, toX: 17, toY: 12, wireType: 'control' },
    { id: 'cv_i0b', fromX: 17, fromY: 12, toX: 25, toY: 12, wireType: 'control' },
    { id: 'cv_i0c', fromX: 25, fromY: 12, toX: 25, toY: 14, wireType: 'control' },

    { id: 'cv_i1a', fromX: 23, fromY: 9, toX: 23, toY: 11, wireType: 'control' },
    { id: 'cv_i1b', fromX: 23, fromY: 11, toX: 26, toY: 11, wireType: 'control' },
    { id: 'cv_i1c', fromX: 26, fromY: 11, toX: 26, toY: 14, wireType: 'control' },

    { id: 'cv_i2a', fromX: 29, fromY: 9, toX: 29, toY: 10, wireType: 'control' },
    { id: 'cv_i2b', fromX: 29, fromY: 10, toX: 27, toY: 10, wireType: 'control' },
    { id: 'cv_i2c', fromX: 27, fromY: 10, toX: 27, toY: 14, wireType: 'control' },

    { id: 'cv_i3a', fromX: 35, fromY: 9, toX: 35, toY: 11, wireType: 'control' },
    { id: 'cv_i3b', fromX: 35, fromY: 11, toX: 28, toY: 11, wireType: 'control' },
    { id: 'cv_i3c', fromX: 28, fromY: 11, toX: 28, toY: 14, wireType: 'control' },

    { id: 'cv_i4a', fromX: 41, fromY: 9, toX: 41, toY: 12, wireType: 'control' },
    { id: 'cv_i4b', fromX: 41, fromY: 12, toX: 29, toY: 12, wireType: 'control' },
    { id: 'cv_i4c', fromX: 29, fromY: 12, toX: 29, toY: 14, wireType: 'control' },

    // Salidas Q0.0 (-KM1), Q0.1 (-H1), Q0.2 (Y1), Q0.3 (Y2)
    { id: 'cv_q0a', fromX: 25, fromY: 20, toX: 25, toY: 22, wireType: 'control' },
    { id: 'cv_q0b', fromX: 25, fromY: 22, toX: 17, toY: 22, wireType: 'control' },
    { id: 'cv_q0c', fromX: 17, fromY: 22, toX: 17, toY: 24, wireType: 'control' },

    { id: 'cv_q1a', fromX: 26, fromY: 20, toX: 26, toY: 23, wireType: 'control' },
    { id: 'cv_q1b', fromX: 26, fromY: 23, toX: 23, toY: 23, wireType: 'control' },
    { id: 'cv_q1c', fromX: 23, fromY: 23, toX: 23, toY: 24, wireType: 'control' },

    { id: 'cv_q2a', fromX: 27, fromY: 20, toX: 27, toY: 22, wireType: 'control' },
    { id: 'cv_q2b', fromX: 27, fromY: 22, toX: 30, toY: 22, wireType: 'control' },
    { id: 'cv_q2c', fromX: 30, fromY: 22, toX: 30, toY: 24, wireType: 'control' },

    { id: 'cv_q3a', fromX: 28, fromY: 20, toX: 28, toY: 21, wireType: 'control' },
    { id: 'cv_q3b', fromX: 28, fromY: 21, toX: 34, toY: 21, wireType: 'control' },
    { id: 'cv_q3c', fromX: 34, fromY: 21, toX: 34, toY: 24, wireType: 'control' },

    // Retorno 0V DC (NEG=14,4) a PLC M (24,14) y cargas inferiores (y=29)
    { id: 'cv_n0', fromX: 14, fromY: 4, toX: 46, toY: 4, wireType: 'dc_neg' },
    { id: 'cv_n1', fromX: 46, fromY: 4, toX: 46, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_n2', fromX: 46, fromY: 29, toX: 34, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_n3', fromX: 34, fromY: 29, toX: 30, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_n4', fromX: 30, fromY: 29, toX: 23, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_n5', fromX: 23, fromY: 29, toX: 17, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_n6', fromX: 17, fromY: 27, toX: 17, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_n7', fromX: 23, fromY: 27, toX: 23, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_n8', fromX: 30, fromY: 27, toX: 30, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_n9', fromX: 34, fromY: 27, toX: 34, toY: 29, wireType: 'dc_neg' },
    { id: 'cv_m1', fromX: 14, fromY: 4, toX: 14, toY: 13, wireType: 'dc_neg' },
    { id: 'cv_m2', fromX: 14, fromY: 13, toX: 24, toY: 13, wireType: 'dc_neg' },
    { id: 'cv_m3', fromX: 24, fromY: 13, toX: 24, toY: 14, wireType: 'dc_neg' }
  ],
  junctions: [
    { id: 'cv_j1', x: 13, y: 5 },
    { id: 'cv_j2', x: 17, y: 5 },
    { id: 'cv_j3', x: 23, y: 5 },
    { id: 'cv_j4', x: 29, y: 5 },
    { id: 'cv_j5', x: 35, y: 5 },
    { id: 'cv_j6', x: 13, y: 14 },
    { id: 'cv_j7', x: 14, y: 4 },
    { id: 'cv_j8', x: 23, y: 29 },
    { id: 'cv_j9', x: 30, y: 29 },
    { id: 'cv_j10', x: 34, y: 29 }
  ]
};

export const CONVEYOR_PROJECT_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Banda_Clasificadora',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Pulsador_Marcha', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador NA marcha banda clasificadora' },
    { address: '%I0.1', name: 'Pulsador_Paro', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador parada general del sistema' },
    { address: '%I0.2', name: 'Sensor_Metalico_B1', dataType: 'Bool', schematicTag: '-B1', comment: 'Sensor presencia / inductivo clasificador' },
    { address: '%I0.3', name: 'Sensor_Desviador_a0', dataType: 'Bool', schematicTag: 'a0', comment: 'Final de carrera piston desviador retraido' },
    { address: '%I0.4', name: 'Sensor_Desviador_a1', dataType: 'Bool', schematicTag: 'a1', comment: 'Final de carrera piston desviador extendido' },
    { address: '%Q0.0', name: 'Motor_Banda_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Contactor motor banda transportadora' },
    { address: '%Q0.1', name: 'Baliza_Marcha_H1', dataType: 'Bool', schematicTag: '-H1', comment: 'Piloto verde planta en servicio' },
    { address: '%Q0.2', name: 'Piston_Desvio_Y1', dataType: 'Bool', schematicTag: 'Y1', comment: 'Solenoide avance desviador A+' },
    { address: '%Q0.3', name: 'Piston_Retorno_Y2', dataType: 'Bool', schematicTag: 'Y2', comment: 'Solenoide retorno desviador A-' },
    { address: '%M0.0', name: 'Sistema_Habilitado', dataType: 'Bool', comment: 'Rele interno sistema en servicio' },
    { address: '%M0.1', name: 'Pulso_Desvio_OK', dataType: 'Bool', comment: 'Confirmacion temporizador TON_Clasif' }
  ],
  rungs: [
    {
      id: 'cv_r1',
      number: 1,
      comment: 'Marcha y Autoenclavamiento del Motor de la Banda Transportadora (-KM1)',
      branches: [
        { id: 'cv_b1', contacts: [{ id: 'cv_c1', type: 'NO', address: '%I0.0' }] },
        { id: 'cv_b2', contacts: [{ id: 'cv_c2', type: 'NO', address: '%M0.0' }] }
      ],
      seriesContacts: [{ id: 'cv_c3', type: 'NC', address: '%I0.1' }],
      coils: [
        { id: 'cv_q1', type: 'OUT', address: '%M0.0' },
        { id: 'cv_q2', type: 'OUT', address: '%Q0.0' }
      ]
    },
    {
      id: 'cv_r2',
      number: 2,
      comment: 'Detección Sensor -B1 + Temporizador TON_Clasif (1.0 s) y Disparo Desviador A+ (Y1)',
      branches: [{ id: 'cv_b3', contacts: [{ id: 'cv_c4', type: 'NO', address: '%M0.0' }] }],
      seriesContacts: [
        { id: 'cv_c5', type: 'NO', address: '%I0.2' },
        { id: 'cv_c6', type: 'NO', address: '%I0.3' }
      ],
      timer: { id: 'cv_tm1', name: 'TON_Clasif', type: 'TON', presetSeconds: 1.0 },
      coils: [
        { id: 'cv_q3', type: 'OUT', address: '%M0.1' },
        { id: 'cv_q4', type: 'SET', address: '%Q0.2' },
        { id: 'cv_q5', type: 'RESET', address: '%Q0.3' }
      ]
    },
    {
      id: 'cv_r3',
      number: 3,
      comment: 'Retorno Automático del Pistón Desviador A- (Y2) al detectar a1',
      branches: [{ id: 'cv_b4', contacts: [{ id: 'cv_c7', type: 'NO', address: '%I0.4' }] }],
      seriesContacts: [],
      coils: [
        { id: 'cv_q6', type: 'RESET', address: '%Q0.2' },
        { id: 'cv_q7', type: 'SET', address: '%Q0.3' }
      ]
    },
    {
      id: 'cv_r4',
      number: 4,
      comment: 'Baliza Señalizadora de Marcha / Sistema en Servicio (-H1)',
      branches: [{ id: 'cv_b5', contacts: [{ id: 'cv_c8', type: 'NO', address: '%M0.0' }] }],
      seriesContacts: [{ id: 'cv_c9', type: 'NO', address: '%Q0.0' }],
      coils: [{ id: 'cv_q8', type: 'OUT', address: '%Q0.1' }]
    }
  ],
  sclCode: `// Nivel 7: Proyecto Banda Transportadora Clasificadora (OB1 / Clasificador_FB)
// Autor: Simon Barrera Ruiz

// Network 1: Marcha y paro con autoenclavamiento
IF ("Pulsador_Marcha" OR "Sistema_Habilitado") AND NOT "Pulsador_Paro" THEN
    "Sistema_Habilitado" := TRUE;
    "Motor_Banda_KM1" := TRUE;
ELSE
    "Sistema_Habilitado" := FALSE;
    "Motor_Banda_KM1" := FALSE;
END_IF;

// Network 2: Retardo de posicionamiento frente al desviador (TON_Clasif)
"TON_Clasif"(IN := "Sistema_Habilitado" AND "Sensor_Metalico_B1" AND "Sensor_Desviador_a0", PT := T#1s);
"Pulso_Desvio_OK" := TON_Clasif.Q;

// Network 3: Control secuencial del cilindro desviador A+ / A-
IF "Pulso_Desvio_OK" AND NOT "Sensor_Desviador_a1" THEN
    "Piston_Desvio_Y1" := TRUE;
    "Piston_Retorno_Y2" := FALSE;
ELSIF "Sensor_Desviador_a1" OR NOT "Sistema_Habilitado" THEN
    "Piston_Desvio_Y1" := FALSE;
    "Piston_Retorno_Y2" := TRUE;
END_IF;

// Network 4: Baliza senalizadora verde en servicio
"Baliza_Marcha_H1" := "Sistema_Habilitado" AND "Motor_Banda_KM1";
`,
  grafcetSteps: [
    { id: 0, name: 'Reposo', isInitial: true, actionTag: '', actionLabel: 'Banda detenida — Esperando Marcha (-S1)' },
    { id: 1, name: 'Banda ON', isInitial: false, actionTag: '%Q0.0', actionLabel: 'Motor cinta en marcha (-KM1) escaneando -B1' },
    { id: 2, name: 'Desvio A+', isInitial: false, actionTag: '%Q0.2', actionLabel: 'Clasificar pieza metálica: Activar Y1 (A+)' },
    { id: 3, name: 'Retorno', isInitial: false, actionTag: '%Q0.3', actionLabel: 'Retraer desviador neumático: Activar Y2 (A-)' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND NOT %I0.1', label: 'Marcha (-S1)' },
    { id: 2, fromStep: 1, toStep: 2, condition: '%I0.2 AND %I0.3', label: 'Pieza metálica (-B1) · a0' },
    { id: 3, fromStep: 2, toStep: 3, condition: '%I0.4', label: 'Desviador extendido (a1)' },
    { id: 4, fromStep: 3, toStep: 1, condition: '%I0.3 AND NOT %I0.1', label: 'Desviador en origen (a0)' },
    { id: 5, fromStep: 1, toStep: 0, condition: '%I0.1', label: 'Paro general (-S0)' }
  ]
};

// ============================================================================
// NIVEL 8: PROYECTO FINAL — PLANTA EMBOTELLADORA INDUSTRIAL GEMMA (S7-1200)
// ============================================================================
export const BOTTLING_GEMMA_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: '8. Proyecto Final: Embotelladora GEMMA (S7-1200)',
    project: 'Planta Embotelladora Industrial — Guía GEMMA',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '3.0',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA MOTOR BANDA EMBOTELLADORA ----------------
    { id: 'emb_pow3', type: 'power_3phase_pe', tag: '3L+PE', x: 4, y: 2, rotation: 0 },
    { id: 'emb_q1', type: 'breaker_3p', tag: '-Q1', x: 4, y: 6, rotation: 0, state: { isOpen: false } },
    { id: 'emb_km1', type: 'contactor_power_3p', tag: '-KM1', x: 4, y: 12, rotation: 0 },
    { id: 'emb_f1', type: 'thermal_relay_power', tag: '-F1', x: 4, y: 18, rotation: 0, state: { isOpen: false } },
    { id: 'emb_m1', type: 'motor_3phase', tag: '-M1', x: 4, y: 24, rotation: 0 },

    // ---------------- ENTRADAS GEMMA 24V DC ----------------
    { id: 'emb_dc', type: 'power_dc', tag: '24VDC', x: 12, y: 2, rotation: 0 },
    { id: 'btn_start', type: 'button_no', tag: '-S1', plcAddress: '%I0.0', x: 16, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'btn_stop', type: 'button_no', tag: '-S0', plcAddress: '%I0.1', x: 22, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'emb_f1_no', type: 'thermal_contact_no', tag: '-F1', plcAddress: '%I0.2', x: 28, y: 6, rotation: 0 },
    { id: 'emb_a0', type: 'limit_switch_no', tag: 'a0', plcAddress: '%I0.3', x: 34, y: 6, rotation: 0, state: { isActuated: false } },
    { id: 'emb_a1', type: 'limit_switch_no', tag: 'a1', plcAddress: '%I0.4', x: 40, y: 6, rotation: 0, state: { isActuated: false } },

    // ---------------- PLC SIEMENS S7-1200 CPU 1214C ----------------
    { id: 'emb_cpu', type: 'plc_cpu_s71200', tag: 'PLC1', x: 22, y: 14, rotation: 0 },

    // ---------------- SALIDAS: BANDA, TORRETA F1 Y LLENADORA/TAPONADORA ----------------
    { id: 'coil_km1', type: 'coil_contactor', tag: '-KM1', plcAddress: '%Q0.0', x: 16, y: 24, rotation: 0 },
    { id: 'pilot_run', type: 'pilot_light_green', tag: '-H1', plcAddress: '%Q0.1', x: 22, y: 24, rotation: 0 },
    { id: 'emb_valve', type: 'solenoid_valve_5_2', tag: '-A', x: 29, y: 24, rotation: 0 },
    { id: 'emb_cyl', type: 'pneumatic_cylinder_da', tag: '-A', x: 37, y: 15, rotation: 0, state: { pistonPos: 0 } }
  ],
  wires: [
    // Fuerza Trifásica Banda Embotelladora
    { id: 'emb_p1', fromX: 5, fromY: 4, toX: 5, toY: 6, wireType: 'phase1' },
    { id: 'emb_p2', fromX: 6, fromY: 4, toX: 6, toY: 6, wireType: 'phase2' },
    { id: 'emb_p3', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase3' },
    { id: 'emb_p4', fromX: 5, fromY: 10, toX: 5, toY: 12, wireType: 'phase1' },
    { id: 'emb_p5', fromX: 6, fromY: 10, toX: 6, toY: 12, wireType: 'phase2' },
    { id: 'emb_p6', fromX: 7, fromY: 10, toX: 7, toY: 12, wireType: 'phase3' },
    { id: 'emb_p7', fromX: 5, fromY: 16, toX: 5, toY: 18, wireType: 'phase1' },
    { id: 'emb_p8', fromX: 6, fromY: 16, toX: 6, toY: 18, wireType: 'phase2' },
    { id: 'emb_p9', fromX: 7, fromY: 16, toX: 7, toY: 18, wireType: 'phase3' },
    { id: 'emb_p10', fromX: 5, fromY: 22, toX: 5, toY: 24, wireType: 'phase1' },
    { id: 'emb_p11', fromX: 6, fromY: 22, toX: 6, toY: 24, wireType: 'phase2' },
    { id: 'emb_p12', fromX: 7, fromY: 22, toX: 7, toY: 24, wireType: 'phase3' },
    { id: 'emb_pe', fromX: 8, fromY: 4, toX: 8, toY: 26, wireType: 'pe' },

    // Bus +24V DC segmentado limpiamente (POS=13,4)
    { id: 'emb_dc1', fromX: 13, fromY: 4, toX: 13, toY: 5, wireType: 'dc_pos' },
    { id: 'emb_dc2', fromX: 13, fromY: 5, toX: 13, toY: 14, wireType: 'dc_pos' },
    { id: 'emb_dc3', fromX: 13, fromY: 14, toX: 13, toY: 20, wireType: 'dc_pos' },
    { id: 'emb_dc4', fromX: 13, fromY: 14, toX: 23, toY: 14, wireType: 'dc_pos' },
    { id: 'emb_dc5', fromX: 13, fromY: 20, toX: 23, toY: 20, wireType: 'dc_pos' },
    { id: 'emb_dc6', fromX: 13, fromY: 5, toX: 17, toY: 5, wireType: 'dc_pos' },
    { id: 'emb_dc7', fromX: 17, fromY: 5, toX: 23, toY: 5, wireType: 'dc_pos' },
    { id: 'emb_dc8', fromX: 23, fromY: 5, toX: 29, toY: 5, wireType: 'dc_pos' },
    { id: 'emb_dc9', fromX: 29, fromY: 5, toX: 35, toY: 5, wireType: 'dc_pos' },
    { id: 'emb_dc10', fromX: 35, fromY: 5, toX: 41, toY: 5, wireType: 'dc_pos' },
    { id: 'emb_dc11', fromX: 17, fromY: 5, toX: 17, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_dc12', fromX: 23, fromY: 5, toX: 23, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_dc13', fromX: 29, fromY: 5, toX: 29, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_dc14', fromX: 35, fromY: 5, toX: 35, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_dc15', fromX: 41, fromY: 5, toX: 41, toY: 6, wireType: 'dc_pos' },

    // Entradas I0.0 (-S1), I0.1 (-S0), I0.2 (-F1), I0.3 (a0), I0.4 (a1)
    { id: 'emb_i0a', fromX: 17, fromY: 9, toX: 17, toY: 12, wireType: 'control' },
    { id: 'emb_i0b', fromX: 17, fromY: 12, toX: 25, toY: 12, wireType: 'control' },
    { id: 'emb_i0c', fromX: 25, fromY: 12, toX: 25, toY: 14, wireType: 'control' },

    { id: 'emb_i1a', fromX: 23, fromY: 9, toX: 23, toY: 11, wireType: 'control' },
    { id: 'emb_i1b', fromX: 23, fromY: 11, toX: 26, toY: 11, wireType: 'control' },
    { id: 'emb_i1c', fromX: 26, fromY: 11, toX: 26, toY: 14, wireType: 'control' },

    { id: 'emb_i2a', fromX: 29, fromY: 9, toX: 29, toY: 10, wireType: 'control' },
    { id: 'emb_i2b', fromX: 29, fromY: 10, toX: 27, toY: 10, wireType: 'control' },
    { id: 'emb_i2c', fromX: 27, fromY: 10, toX: 27, toY: 14, wireType: 'control' },

    { id: 'emb_i3a', fromX: 35, fromY: 9, toX: 35, toY: 11, wireType: 'control' },
    { id: 'emb_i3b', fromX: 35, fromY: 11, toX: 28, toY: 11, wireType: 'control' },
    { id: 'emb_i3c', fromX: 28, fromY: 11, toX: 28, toY: 14, wireType: 'control' },

    { id: 'emb_i4a', fromX: 41, fromY: 9, toX: 41, toY: 12, wireType: 'control' },
    { id: 'emb_i4b', fromX: 41, fromY: 12, toX: 29, toY: 12, wireType: 'control' },
    { id: 'emb_i4c', fromX: 29, fromY: 12, toX: 29, toY: 14, wireType: 'control' },

    // Salidas Q0.0 (-KM1), Q0.1 (-H1 Torreta F1), Q0.2 (Y1 Llenado), Q0.3 (Y2 Tapado)
    { id: 'emb_q0a', fromX: 25, fromY: 20, toX: 25, toY: 22, wireType: 'control' },
    { id: 'emb_q0b', fromX: 25, fromY: 22, toX: 17, toY: 22, wireType: 'control' },
    { id: 'emb_q0c', fromX: 17, fromY: 22, toX: 17, toY: 24, wireType: 'control' },

    { id: 'emb_q1a', fromX: 26, fromY: 20, toX: 26, toY: 23, wireType: 'control' },
    { id: 'emb_q1b', fromX: 26, fromY: 23, toX: 23, toY: 23, wireType: 'control' },
    { id: 'emb_q1c', fromX: 23, fromY: 23, toX: 23, toY: 24, wireType: 'control' },

    { id: 'emb_q2a', fromX: 27, fromY: 20, toX: 27, toY: 22, wireType: 'control' },
    { id: 'emb_q2b', fromX: 27, fromY: 22, toX: 30, toY: 22, wireType: 'control' },
    { id: 'emb_q2c', fromX: 30, fromY: 22, toX: 30, toY: 24, wireType: 'control' },

    { id: 'emb_q3a', fromX: 28, fromY: 20, toX: 28, toY: 21, wireType: 'control' },
    { id: 'emb_q3b', fromX: 28, fromY: 21, toX: 34, toY: 21, wireType: 'control' },
    { id: 'emb_q3c', fromX: 34, fromY: 21, toX: 34, toY: 24, wireType: 'control' },

    // Retorno 0V DC (NEG=14,4) a PLC M (24,14) y cargas inferiores (y=29)
    { id: 'emb_n0', fromX: 14, fromY: 4, toX: 46, toY: 4, wireType: 'dc_neg' },
    { id: 'emb_n1', fromX: 46, fromY: 4, toX: 46, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_n2', fromX: 46, fromY: 29, toX: 34, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_n3', fromX: 34, fromY: 29, toX: 30, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_n4', fromX: 30, fromY: 29, toX: 23, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_n5', fromX: 23, fromY: 29, toX: 17, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_n6', fromX: 17, fromY: 27, toX: 17, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_n7', fromX: 23, fromY: 27, toX: 23, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_n8', fromX: 30, fromY: 27, toX: 30, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_n9', fromX: 34, fromY: 27, toX: 34, toY: 29, wireType: 'dc_neg' },
    { id: 'emb_m1', fromX: 14, fromY: 4, toX: 14, toY: 13, wireType: 'dc_neg' },
    { id: 'emb_m2', fromX: 14, fromY: 13, toX: 24, toY: 13, wireType: 'dc_neg' },
    { id: 'emb_m3', fromX: 24, fromY: 13, toX: 24, toY: 14, wireType: 'dc_neg' }
  ],
  junctions: [
    { id: 'emb_j1', x: 13, y: 5 },
    { id: 'emb_j2', x: 17, y: 5 },
    { id: 'emb_j3', x: 23, y: 5 },
    { id: 'emb_j4', x: 29, y: 5 },
    { id: 'emb_j5', x: 35, y: 5 },
    { id: 'emb_j6', x: 13, y: 14 },
    { id: 'emb_j7', x: 14, y: 4 },
    { id: 'emb_j8', x: 23, y: 29 },
    { id: 'emb_j9', x: 30, y: 29 },
    { id: 'emb_j10', x: 34, y: 29 }
  ]
};

export const BOTTLING_GEMMA_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Embotelladora_GEMMA',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Pulsador_Marcha_F1', dataType: 'Bool', schematicTag: '-S1', comment: 'Marcha produccion normal GEMMA F1 (I_March)' },
    { address: '%I0.1', name: 'Paro_Emergencia_D1', dataType: 'Bool', schematicTag: '-S0', comment: 'Parada de emergencia GEMMA D1 (I_PE)' },
    { address: '%I0.2', name: 'Falla_Termica_F1', dataType: 'Bool', schematicTag: '-F1', comment: 'Sobrecarga termica GEMMA D2 (FG)' },
    { address: '%I0.3', name: 'Sensor_Botella_a0', dataType: 'Bool', schematicTag: 'a0', comment: 'Sensor botella y tope inicial cabezal a0 (I_a0 / CP1)' },
    { address: '%I0.4', name: 'Fin_Tapado_a1', dataType: 'Bool', schematicTag: 'a1', comment: 'Final de carrera llenado/taponado a1 (I_a1 / CP2)' },
    { address: '%Q0.0', name: 'Motor_Banda_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Contactor banda transportadora de botellas (B+)' },
    { address: '%Q0.1', name: 'Torreta_Verde_F1', dataType: 'Bool', schematicTag: '-H1', comment: 'Torreta verde produccion normal GEMMA F1 (Q_H_RUN)' },
    { address: '%Q0.2', name: 'Valvula_Llenado_Y1', dataType: 'Bool', schematicTag: 'Y1', comment: 'Solenoide llenado y descenso cabezal A+ (Q_C_MAS)' },
    { address: '%Q0.3', name: 'Piston_Tapado_Y2', dataType: 'Bool', schematicTag: 'Y2', comment: 'Solenoide taponado y subida cabezal A- (Q_E_MEN)' },
    { address: '%M0.0', name: 'Estado_F1_Produccion', dataType: 'Bool', comment: 'Marca GEMMA F1 produccion activa (E31)' },
    { address: '%M0.1', name: 'Tiempo_Llenado_OK', dataType: 'Bool', comment: 'Salida temporizador dosificacion TON_Llenado' }
  ],
  rungs: [
    {
      id: 'emb_r1',
      number: 1,
      comment: 'Conducción GEMMA F1 (Producción Normal) con bloqueo ante Emergencia D1 (-S0) y Falla D2 (-F1)',
      branches: [
        { id: 'emb_b1', contacts: [{ id: 'emb_c1', type: 'NO', address: '%I0.0' }] },
        { id: 'emb_b2', contacts: [{ id: 'emb_c2', type: 'NO', address: '%M0.0' }] }
      ],
      seriesContacts: [
        { id: 'emb_c3', type: 'NC', address: '%I0.1' },
        { id: 'emb_c4', type: 'NC', address: '%I0.2' }
      ],
      coils: [
        { id: 'emb_q1', type: 'OUT', address: '%M0.0' },
        { id: 'emb_q2', type: 'OUT', address: '%Q0.1' }
      ]
    },
    {
      id: 'emb_r2',
      number: 2,
      comment: 'Avance Banda Embotelladora (-KM1) en modo Producción F1',
      branches: [{ id: 'emb_b3', contacts: [{ id: 'emb_c5', type: 'NO', address: '%M0.0' }] }],
      seriesContacts: [],
      coils: [{ id: 'emb_q3', type: 'OUT', address: '%Q0.0' }]
    },
    {
      id: 'emb_r3',
      number: 3,
      comment: 'Estación Llenado (Y1 / A+) con Dosificación Temporizada TON_Llenado (2.0 s)',
      branches: [{ id: 'emb_b4', contacts: [{ id: 'emb_c6', type: 'NO', address: '%M0.0' }] }],
      seriesContacts: [
        { id: 'emb_c7', type: 'NO', address: '%I0.3' },
        { id: 'emb_c8', type: 'NC', address: '%I0.4' }
      ],
      timer: { id: 'emb_tm1', name: 'TON_Llenado', type: 'TON', presetSeconds: 2.0 },
      coils: [
        { id: 'emb_q4', type: 'OUT', address: '%M0.1' },
        { id: 'emb_q5', type: 'SET', address: '%Q0.2' },
        { id: 'emb_q6', type: 'RESET', address: '%Q0.3' }
      ]
    },
    {
      id: 'emb_r4',
      number: 4,
      comment: 'Estación Taponado y Retorno Cabezal (Y2 / A-) al alcanzar fin de carrera a1',
      branches: [{ id: 'emb_b5', contacts: [{ id: 'emb_c9', type: 'NO', address: '%I0.4' }] }],
      seriesContacts: [{ id: 'emb_c10', type: 'NO', address: '%M0.0' }],
      coils: [
        { id: 'emb_q7', type: 'RESET', address: '%Q0.2' },
        { id: 'emb_q8', type: 'SET', address: '%Q0.3' }
      ]
    },
    {
      id: 'emb_r5',
      number: 5,
      comment: 'Seguridad GEMMA D1 / D2 — Corte Seguro de Electroválvulas Y1 / Y2',
      branches: [
        { id: 'emb_b6', contacts: [{ id: 'emb_c11', type: 'NO', address: '%I0.1' }] },
        { id: 'emb_b7', contacts: [{ id: 'emb_c12', type: 'NO', address: '%I0.2' }] }
      ],
      seriesContacts: [],
      coils: [
        { id: 'emb_q9', type: 'RESET', address: '%Q0.2' },
        { id: 'emb_q10', type: 'RESET', address: '%Q0.3' }
      ]
    }
  ],
  sclCode: `// Nivel 8: Proyecto Final — Planta Embotelladora Industrial GEMMA (OB1)
// Modos GEMMA: A1 (Reposo), F1 (Produccion), D1 (Emergencia), D2 (Falla Termica)
// Autor: Simon Barrera Ruiz

// 1. Conduccion GEMMA F1 y corte de seguridad D1/D2
IF ("Pulsador_Marcha_F1" OR "Estado_F1_Produccion") AND NOT "Paro_Emergencia_D1" AND NOT "Falla_Termica_F1" THEN
    "Estado_F1_Produccion" := TRUE;
    "Torreta_Verde_F1" := TRUE;
    "Motor_Banda_KM1" := TRUE;
ELSE
    "Estado_F1_Produccion" := FALSE;
    "Torreta_Verde_F1" := FALSE;
    "Motor_Banda_KM1" := FALSE;
END_IF;

// 2. Temporizador de dosificacion en Estacion 2 (TON_Llenado = 2.0 s)
"TON_Llenado"(IN := "Estado_F1_Produccion" AND "Sensor_Botella_a0" AND NOT "Fin_Tapado_a1", PT := T#2s);
"Tiempo_Llenado_OK" := TON_Llenado.Q;

// 3. Control electroneumatico de Llenado (Y1 / A+) y Taponado (Y2 / A-)
IF NOT "Estado_F1_Produccion" THEN
    "Valvula_Llenado_Y1" := FALSE;
    "Piston_Tapado_Y2" := FALSE;
ELSIF "Tiempo_Llenado_OK" AND NOT "Fin_Tapado_a1" THEN
    "Valvula_Llenado_Y1" := TRUE;
    "Piston_Tapado_Y2" := FALSE;
ELSIF "Fin_Tapado_a1" THEN
    "Valvula_Llenado_Y1" := FALSE;
    "Piston_Tapado_Y2" := TRUE;
END_IF;
`,
  grafcetSteps: [
    { id: 0, name: 'A1 Reposo', isInitial: true, actionTag: '', actionLabel: 'GEMMA A1 (E0): Planta en reposo inicial' },
    { id: 1, name: 'F1 Banda', isInitial: false, actionTag: '%Q0.0', actionLabel: 'GEMMA F1 (E1): Avance banda embotelladora (-KM1)' },
    { id: 2, name: 'Llenado', isInitial: false, actionTag: '%Q0.2', actionLabel: 'Estación 2 (E8): Dosificación y llenado (Y1 / A+)' },
    { id: 3, name: 'Tapado', isInitial: false, actionTag: '%Q0.3', actionLabel: 'Estación 3 (E13): Taponado y retorno cabezal (Y2 / A-)' },
    { id: 4, name: 'Salida', isInitial: false, actionTag: '%Q0.1', actionLabel: 'Botella terminada — Torreta Verde F1 (-H1)' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND NOT %I0.1 AND NOT %I0.2', label: 'Marcha GEMMA F1 (-S1)' },
    { id: 2, fromStep: 1, toStep: 2, condition: '%I0.3 AND NOT %I0.1', label: 'Botella en estación (a0)' },
    { id: 3, fromStep: 2, toStep: 3, condition: '%I0.4', label: 'Fin carrera llenado (a1)' },
    { id: 4, fromStep: 3, toStep: 4, condition: '%I0.3', label: 'Cabezal arriba (a0)' },
    { id: 5, fromStep: 4, toStep: 1, condition: 'NOT %I0.1 AND NOT %I0.2', label: 'Ciclo automático F1' },
    { id: 6, fromStep: 1, toStep: 0, condition: '%I0.1 OR %I0.2', label: 'Emergencia D1 (-S0) / Falla D2 (-F1)' },
    { id: 7, fromStep: 4, toStep: 0, condition: '%I0.1 OR %I0.2', label: 'Paro Fin Ciclo / Emergencia D1' }
  ]
};

// ============================================================================
// LEGACY COMPATIBILITY EXPORT: CINTA TRANSPORTADORA CABLEADA (IEC 60204-1)
// ============================================================================
export const CONVEYOR_BELT_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: 'Automatismo de Cinta Transportadora Industrial',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.1',
    company: 'Sistemas de Automatización'
  },
  components: [
    { id: 'pow_1', type: 'power_3phase_pe', tag: '3L+PE', x: 6, y: 2, rotation: 0 },
    { id: 'brk_1', type: 'breaker_3p', tag: '-Q1', x: 6, y: 6, rotation: 0, state: { isOpen: false } },
    { id: 'cnt_1', type: 'contactor_power_3p', tag: '-KM1', x: 6, y: 12, rotation: 0 },
    { id: 'thm_1', type: 'thermal_relay_power', tag: '-F1', x: 6, y: 18, rotation: 0, state: { isOpen: false } },
    { id: 'mot_1', type: 'motor_3phase', tag: '-M1', x: 6, y: 24, rotation: 0 },

    { id: 'pow_ctrl_ln', type: 'power_ln', tag: 'L-N', x: 18, y: 2, rotation: 0 },
    { id: 'brk_ctrl', type: 'breaker_1p_n', tag: '-Q2', x: 18, y: 5, rotation: 0, state: { isOpen: false } },
    { id: 'thm_nc', type: 'thermal_contact_nc', tag: '-F1', x: 18, y: 11, rotation: 0 },
    { id: 'btn_es', type: 'emergency_stop', tag: '-S0', x: 18, y: 15, rotation: 0, state: { isActuated: false } },
    { id: 'sensor_b1', type: 'limit_switch_nc', tag: '-B1', x: 18, y: 19, rotation: 0, state: { isActuated: false } },
    { id: 'btn_start', type: 'button_no', tag: '-S1', x: 18, y: 24, rotation: 0, state: { isActuated: false } },
    { id: 'aux_latch', type: 'contact_no', tag: '-KM1', x: 23, y: 24, rotation: 0 },
    { id: 'coil_km1', type: 'coil_contactor', tag: '-KM1', x: 18, y: 29, rotation: 0 },
    { id: 'pilot_green', type: 'pilot_light_green', tag: '-H1', x: 23, y: 29, rotation: 0 },
    { id: 'aux_km1_nc', type: 'contact_nc', tag: '-KM1', x: 28, y: 24, rotation: 0 },
    { id: 'pilot_red', type: 'pilot_light_red', tag: '-H2', x: 28, y: 29, rotation: 0 },
    { id: 'thm_no', type: 'thermal_contact_no', tag: '-F1', x: 33, y: 24, rotation: 0 },
    { id: 'pilot_yellow', type: 'pilot_light_yellow', tag: '-H3', x: 33, y: 29, rotation: 0 }
  ],
  wires: [
    { id: 'w_conv_p1', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase1' },
    { id: 'w_conv_p2', fromX: 8, fromY: 4, toX: 8, toY: 6, wireType: 'phase2' },
    { id: 'w_conv_p3', fromX: 9, fromY: 4, toX: 9, toY: 6, wireType: 'phase3' },
    { id: 'w_conv_p4', fromX: 7, fromY: 10, toX: 7, toY: 12, wireType: 'phase1' },
    { id: 'w_conv_p5', fromX: 8, fromY: 10, toX: 8, toY: 12, wireType: 'phase2' },
    { id: 'w_conv_p6', fromX: 9, fromY: 10, toX: 9, toY: 12, wireType: 'phase3' },
    { id: 'w_conv_p7', fromX: 7, fromY: 16, toX: 7, toY: 18, wireType: 'phase1' },
    { id: 'w_conv_p8', fromX: 8, fromY: 16, toX: 8, toY: 18, wireType: 'phase2' },
    { id: 'w_conv_p9', fromX: 9, fromY: 16, toX: 9, toY: 18, wireType: 'phase3' },
    { id: 'w_conv_p10', fromX: 7, fromY: 22, toX: 7, toY: 24, wireType: 'phase1' },
    { id: 'w_conv_p11', fromX: 8, fromY: 22, toX: 8, toY: 24, wireType: 'phase2' },
    { id: 'w_conv_p12', fromX: 9, fromY: 22, toX: 9, toY: 24, wireType: 'phase3' },
    { id: 'w_conv_pe', fromX: 10, fromY: 4, toX: 10, toY: 26, wireType: 'pe' },

    // Control Fase L1 sin cortocircuito en térmico NC
    { id: 'w_conv_c1', fromX: 19, fromY: 4, toX: 19, toY: 5, wireType: 'control' },
    { id: 'w_conv_c2', fromX: 19, fromY: 9, toX: 19, toY: 10, wireType: 'control' },
    { id: 'w_conv_c3', fromX: 19, fromY: 10, toX: 19, toY: 11, wireType: 'control' },
    { id: 'w_conv_c4', fromX: 19, fromY: 10, toX: 34, toY: 10, wireType: 'control' },
    { id: 'w_conv_c5', fromX: 34, fromY: 10, toX: 34, toY: 24, wireType: 'control' },
    { id: 'w_conv_c6', fromX: 19, fromY: 14, toX: 19, toY: 15, wireType: 'control' },
    { id: 'w_conv_c7', fromX: 19, fromY: 18, toX: 19, toY: 19, wireType: 'control' },
    { id: 'w_conv_c8', fromX: 19, fromY: 22, toX: 19, toY: 23, wireType: 'control' },
    { id: 'w_conv_c9', fromX: 19, fromY: 23, toX: 19, toY: 24, wireType: 'control' },
    { id: 'w_conv_c10', fromX: 19, fromY: 23, toX: 24, toY: 23, wireType: 'control' },
    { id: 'w_conv_c11', fromX: 24, fromY: 23, toX: 24, toY: 24, wireType: 'control' },
    { id: 'w_conv_c12', fromX: 24, fromY: 23, toX: 29, toY: 23, wireType: 'control' },
    { id: 'w_conv_c13', fromX: 29, fromY: 23, toX: 29, toY: 24, wireType: 'control' },
    { id: 'w_conv_c14', fromX: 19, fromY: 27, toX: 19, toY: 28, wireType: 'control' },
    { id: 'w_conv_c15', fromX: 24, fromY: 27, toX: 24, toY: 28, wireType: 'control' },
    { id: 'w_conv_c16', fromX: 24, fromY: 28, toX: 19, toY: 28, wireType: 'control' },
    { id: 'w_conv_c17', fromX: 19, fromY: 28, toX: 19, toY: 29, wireType: 'control' },
    { id: 'w_conv_c18', fromX: 24, fromY: 28, toX: 24, toY: 29, wireType: 'control' },
    { id: 'w_conv_c19', fromX: 29, fromY: 27, toX: 29, toY: 29, wireType: 'control' },
    { id: 'w_conv_c20', fromX: 34, fromY: 27, toX: 34, toY: 29, wireType: 'control' },

    // Neutro N desde -Q2 segmentado limpiamente (y=34)
    { id: 'w_conv_n0', fromX: 20, fromY: 4, toX: 20, toY: 5, wireType: 'neutral' },
    { id: 'w_conv_n1', fromX: 20, fromY: 9, toX: 38, toY: 9, wireType: 'neutral' },
    { id: 'w_conv_n2', fromX: 38, fromY: 9, toX: 38, toY: 34, wireType: 'neutral' },
    { id: 'w_conv_n3', fromX: 38, fromY: 34, toX: 34, toY: 34, wireType: 'neutral' },
    { id: 'w_conv_n4', fromX: 34, fromY: 34, toX: 29, toY: 34, wireType: 'neutral' },
    { id: 'w_conv_n5', fromX: 29, fromY: 34, toX: 24, toY: 34, wireType: 'neutral' },
    { id: 'w_conv_n6', fromX: 24, fromY: 34, toX: 19, toY: 34, wireType: 'neutral' },
    { id: 'w_conv_n7', fromX: 19, fromY: 32, toX: 19, toY: 34, wireType: 'neutral' },
    { id: 'w_conv_n8', fromX: 24, fromY: 32, toX: 24, toY: 34, wireType: 'neutral' },
    { id: 'w_conv_n9', fromX: 29, fromY: 32, toX: 29, toY: 34, wireType: 'neutral' },
    { id: 'w_conv_n10', fromX: 34, fromY: 32, toX: 34, toY: 34, wireType: 'neutral' }
  ],
  junctions: [
    { id: 'j_conv_1', x: 19, y: 10 },
    { id: 'j_conv_2', x: 19, y: 23 },
    { id: 'j_conv_3', x: 24, y: 23 },
    { id: 'j_conv_4', x: 19, y: 28 },
    { id: 'j_conv_5', x: 24, y: 28 },
    { id: 'j_conv_n1', x: 24, y: 34 },
    { id: 'j_conv_n2', x: 29, y: 34 },
    { id: 'j_conv_n3', x: 34, y: 34 }
  ]
};

// ============================================================================
// CATÁLOGO COMPLETO ORDENADO POR COMPLEJIDAD (NIVEL 1 A NIVEL 8)
// ============================================================================
export const EXAMPLE_PRESETS: ExamplePreset[] = [
  {
    id: 'direct',
    level: 1,
    label: '1. Arranque Directo Trifásico',
    badge: 'NIVEL 1 • POTENCIA',
    description:
      'Arranque directo (DOL) de motor trifásico con guardamotor -Q1, relé térmico -F1, autoenclavamiento -KM1 y piloto verde -H1.',
    plantMode: 'conveyor',
    circuit: DIRECT_STARTER_CIRCUIT,
    tiaProgram: DIRECT_STARTER_TIA_PROGRAM
  },
  {
    id: 'reverse',
    level: 2,
    label: '2. Inversión de Giro 3~ con Enclavamiento',
    badge: 'NIVEL 2 • POTENCIA',
    description:
      'Inversión de giro horario (CW) y antihorario (CCW) mediante cruce de fases en -KM1/-KM2 con doble enclavamiento eléctrico mutuo.',
    plantMode: 'conveyor',
    circuit: REVERSE_STARTER_CIRCUIT,
    tiaProgram: REVERSE_STARTER_TIA_PROGRAM
  },
  {
    id: 'star_delta',
    level: 3,
    label: '3. Arranque Estrella - Triángulo (Y-Δ)',
    badge: 'NIVEL 3 • POTENCIA',
    description:
      'Arranque a tensión reducida Y-Δ para motor de 6 bornes con temporizador TON de 5s (-KT1 / TON_YD) y enclavamiento entre -KM3 y -KM2.',
    plantMode: 'conveyor',
    circuit: STAR_DELTA_CIRCUIT,
    tiaProgram: STAR_DELTA_TIA_PROGRAM
  },
  {
    id: 'water_tank',
    level: 4,
    label: '4. Bomba de Agua y Control de Nivel',
    badge: 'NIVEL 4 • PLANTA 2D',
    description:
      'Control automático y manual de electrobomba con boyas de nivel mínimo (-B_MIN) y máximo (-B_MAX), retención -KM1 y alarma térmica.',
    plantMode: 'tank',
    circuit: WATER_TANK_PUMP_CIRCUIT,
    tiaProgram: WATER_TANK_TIA_PROGRAM
  },
  {
    id: 'plc_s71200',
    level: 5,
    label: '5. Control Motor Trifásico con S7-1200',
    badge: 'NIVEL 5 • TIA + CAD',
    description:
      'Co-simulación bidireccional CADe_SIMU + PLC Siemens S7-1200 CPU 1214C gobernando contactor -KM1, piloto -H1 y temporizador TON_1.',
    plantMode: 'conveyor',
    circuit: PLC_S71200_STARTER_CIRCUIT,
    tiaProgram: PLC_S71200_TIA_PROGRAM
  },
  {
    id: 'pneumatic_plc',
    level: 6,
    label: '6. Electroneumática Secuencia A+ / A- (S7-1200)',
    badge: 'NIVEL 6 • NEUMÁTICA',
    description:
      'Secuencia electroneumática automática A+ / A- gobernada por S7-1200 con electroválvula 5/2 biestable (Y1/Y2), cilindro -A y sensores a0/a1.',
    plantMode: 'pneumatic',
    circuit: PNEUMATIC_PLC_CIRCUIT,
    tiaProgram: PNEUMATIC_TIA_PROGRAM
  },
  {
    id: 'conveyor_project',
    level: 7,
    label: '7. Banda Transportadora Clasificadora (S7-1200)',
    badge: 'NIVEL 7 • PROYECTO',
    description:
      'Proyecto integrador de cinta transportadora clasificadora con motor trifásico -KM1, sensor metálico -B1, cilindro desviador -A (Y1/Y2) y TON_Clasif.',
    plantMode: 'conveyor',
    circuit: CONVEYOR_PROJECT_CIRCUIT,
    tiaProgram: CONVEYOR_PROJECT_TIA_PROGRAM
  },
  {
    id: 'bottling_gemma',
    level: 8,
    label: '8. Proyecto Final: Embotelladora GEMMA (S7-1200)',
    badge: 'NIVEL 8 • PROYECTO FINAL',
    description:
      'Planta embotelladora industrial bajo guía GEMMA (A1 Reposo, F1 Producción, D1 Emergencia, D2 Falla Térmica): banda -M1, llenado/tapado -A y TON_Llenado.',
    plantMode: 'bottling',
    circuit: BOTTLING_GEMMA_CIRCUIT,
    tiaProgram: BOTTLING_GEMMA_TIA_PROGRAM
  }
];

export function getExamplePreset(id: string): ExamplePreset {
  const normalized = id === 'conveyor' ? 'conveyor_project' : id;
  return EXAMPLE_PRESETS.find(preset => preset.id === normalized) ?? EXAMPLE_PRESETS[0];
}
