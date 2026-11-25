import { CircuitDocument } from '../../types/circuit';
import {
  TiaLadderRung,
  TiaProgramDocument,
  TiaTag,
  transpileLadderToScl
} from '../plc/tiaEngine';

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
      seriesContacts: [{ id: 'pnc_8', type: 'NC', address: '%I0.1' }],
      coils: [
        { id: 'pnq_4', type: 'RESET', address: '%Q0.2' },
        { id: 'pnq_5', type: 'SET', address: '%Q0.3' }
      ]
    },
    {
      id: 'pn_r4',
      number: 4,
      comment: 'Paro de Ciclo / Reset Seguro de Electroválvulas (%Q0.2, %Q0.3, %M0.0)',
      branches: [{ id: 'pn_b5', contacts: [{ id: 'pnc_9', type: 'NO', address: '%I0.1' }] }],
      seriesContacts: [],
      coils: [
        { id: 'pnq_6', type: 'RESET', address: '%Q0.2' },
        { id: 'pnq_7', type: 'RESET', address: '%Q0.3' },
        { id: 'pnq_8', type: 'RESET', address: '%M0.0' }
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

IF "Boton_Paro" THEN
    "Electrovalvula_A_Mas" := FALSE;
    "Electrovalvula_A_Menos" := FALSE;
    "Ciclo_Activo" := FALSE;
    "Piloto_Marcha" := FALSE;
ELSIF "Ciclo_Activo" AND "Sensor_a0" AND NOT "Sensor_a1" THEN
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
    { id: 2, fromStep: 1, toStep: 2, condition: '%I0.4 AND NOT %I0.1', label: 'Final de carrera a1' },
    { id: 3, fromStep: 2, toStep: 0, condition: '%I0.3 OR %I0.1', label: 'Retorno completo a0 o Paro (-S0)' },
    { id: 4, fromStep: 1, toStep: 0, condition: '%I0.1', label: 'Paro inmediato (-S0)' }
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

const CONVEYOR_TAGS: TiaTag[] = [
  { address: '%I0.0', name: 'Pulsador_Marcha', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador NA marcha banda clasificadora' },
  { address: '%I0.1', name: 'Pulsador_Paro', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador parada general del sistema' },
  { address: '%I0.2', name: 'Sensor_Optico_B1', dataType: 'Bool', schematicTag: '-B1', comment: 'Sensor optico / inductivo clasificador' },
  { address: '%I0.3', name: 'Sensor_Desviador_a0', dataType: 'Bool', schematicTag: 'a0', comment: 'Final de carrera piston desviador retraido' },
  { address: '%I0.4', name: 'Sensor_Desviador_a1', dataType: 'Bool', schematicTag: 'a1', comment: 'Final de carrera piston desviador extendido' },
  { address: '%I0.5', name: 'Falla_Termica_F1', dataType: 'Bool', schematicTag: '-F1', comment: 'Disparo rele termico banda' },
  { address: '%I8.1', name: 'Pulso_Ciclo_Dcy', dataType: 'Bool', schematicTag: '-Dcy', comment: 'Pulso inicio ciclo GEMMA (CL)' },
  { address: '%I8.2', name: 'Pulso_Etapa_Bp', dataType: 'Bool', schematicTag: '-Bp', comment: 'Pulso paso a paso GEMMA (ET)' },
  { address: '%I8.3', name: 'Paro_Emergencia_NC', dataType: 'Bool', schematicTag: '-PE', comment: 'Parada de emergencia GEMMA D1 (0=EMERG)' },
  { address: '%I8.4', name: 'Rearme_Fallas_NC', dataType: 'Bool', schematicTag: '-RecFa', comment: 'Rearme GEMMA A6 (0=REARME)' },
  { address: '%I8.5', name: 'Selector_Ciclo_CL', dataType: 'Bool', schematicTag: '-CL', comment: 'Selector ciclo a ciclo A2' },
  { address: '%I8.6', name: 'Selector_Etapa_ET', dataType: 'Bool', schematicTag: '-ET', comment: 'Selector etapa a etapa F5' },
  { address: '%Q0.0', name: 'Motor_Banda_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Contactor motor banda transportadora' },
  { address: '%Q0.1', name: 'Baliza_Marcha_H1', dataType: 'Bool', schematicTag: '-H1', comment: 'Piloto verde planta en servicio' },
  { address: '%Q0.2', name: 'Piston_Desvio_Y1', dataType: 'Bool', schematicTag: 'Y1', comment: 'Solenoide empujador desviador A+' },
  { address: '%Q0.3', name: 'Piloto_Alarma_PE_H2', dataType: 'Bool', schematicTag: '-H2', comment: 'Piloto alarma emergencia D1 / retorno Y2' },
  { address: '%M0.0', name: 'Ciclo_Activo', dataType: 'Bool', comment: 'Memoria enclavada de ciclo GEMMA F1' },
  { address: '%M0.1', name: 'Pulso_Desvio_OK', dataType: 'Bool', comment: 'Confirmacion temporizador TON_Desvio' },
  { address: '%M0.2', name: 'Rearme_A6_OK', dataType: 'Bool', comment: 'Condicion inicial rearme GEMMA A6' },
  { address: '%M0.4', name: 'Modo_Habilitado', dataType: 'Bool', comment: 'Habilitacion modo AU / CL / ET' }
];

const CONVEYOR_RUNGS: TiaLadderRung[] = [
  {
    id: 'cv_r1',
    number: 1,
    comment: 'Marcha/Paro & Enclavamiento Ciclo_Activo (%M0.0)',
    branches: [
      { id: 'cv_b1', contacts: [{ id: 'cv_c1', type: 'NO', address: '%I0.0' }] },
      { id: 'cv_b2', contacts: [{ id: 'cv_c2', type: 'NO', address: '%M0.0' }] }
    ],
    seriesContacts: [
      { id: 'cv_c3', type: 'NC', address: '%I0.1' },
      { id: 'cv_c4', type: 'NO', address: '%I8.3' },
      { id: 'cv_c5', type: 'NC', address: '%I0.5' }
    ],
    coils: [{ id: 'cv_q1', type: 'OUT', address: '%M0.0' }]
  },
  {
    id: 'cv_r2',
    number: 2,
    comment: 'Paro de Emergencia D1, Paro -S0 & Falla Térmica -> Reset Seguro (%Q0.0..%Q0.3 & %M0.0)',
    branches: [
      { id: 'cv_b3', contacts: [{ id: 'cv_c6', type: 'NO', address: '%I0.1' }] },
      { id: 'cv_b4', contacts: [{ id: 'cv_c7', type: 'NC', address: '%I8.3' }] },
      { id: 'cv_b5', contacts: [{ id: 'cv_c8', type: 'NO', address: '%I0.5' }] }
    ],
    seriesContacts: [],
    coils: [
      { id: 'cv_q2', type: 'RESET', address: '%Q0.0' },
      { id: 'cv_q3', type: 'RESET', address: '%Q0.1' },
      { id: 'cv_q4', type: 'RESET', address: '%Q0.2' },
      { id: 'cv_q5', type: 'RESET', address: '%Q0.3' },
      { id: 'cv_q6', type: 'RESET', address: '%M0.0' }
    ]
  },
  {
    id: 'cv_r3',
    number: 3,
    comment: 'Rearme GEMMA A6 (-RecFa / %I8.4)',
    branches: [
      { id: 'cv_b6', contacts: [{ id: 'cv_c9', type: 'NC', address: '%I8.4' }] },
      { id: 'cv_b7', contacts: [{ id: 'cv_c10', type: 'NO', address: '%M0.2' }] }
    ],
    seriesContacts: [
      { id: 'cv_c11', type: 'NO', address: '%I8.3' },
      { id: 'cv_c12', type: 'NC', address: '%I0.5' },
      { id: 'cv_c13', type: 'NC', address: '%I0.1' }
    ],
    coils: [{ id: 'cv_q7', type: 'OUT', address: '%M0.2' }]
  },
  {
    id: 'cv_r4',
    number: 4,
    comment: 'Selector Modo Auto (AU) / Ciclo a Ciclo (CL) / Etapa a Etapa (ET)',
    branches: [
      {
        id: 'cv_b8',
        contacts: [
          { id: 'cv_c14', type: 'NC', address: '%I8.5' },
          { id: 'cv_c15', type: 'NC', address: '%I8.6' }
        ]
      },
      {
        id: 'cv_b9',
        contacts: [
          { id: 'cv_c16', type: 'NO', address: '%I8.5' },
          { id: 'cv_c17', type: 'NO', address: '%I8.1' }
        ]
      },
      {
        id: 'cv_b10',
        contacts: [
          { id: 'cv_c18', type: 'NO', address: '%I8.6' },
          { id: 'cv_c19', type: 'NO', address: '%I8.2' }
        ]
      }
    ],
    seriesContacts: [],
    coils: [{ id: 'cv_q8', type: 'OUT', address: '%M0.4' }]
  },
  {
    id: 'cv_r5',
    number: 5,
    comment: 'Motor Banda Transportadora -KM1 (%Q0.0)',
    branches: [{ id: 'cv_b11', contacts: [{ id: 'cv_c20', type: 'NO', address: '%M0.0' }] }],
    seriesContacts: [
      { id: 'cv_c21', type: 'NO', address: '%M0.4' },
      { id: 'cv_c22', type: 'NC', address: '%I0.1' },
      { id: 'cv_c23', type: 'NO', address: '%I8.3' },
      { id: 'cv_c24', type: 'NC', address: '%I0.5' }
    ],
    coils: [{ id: 'cv_q9', type: 'OUT', address: '%Q0.0' }]
  },
  {
    id: 'cv_r6',
    number: 6,
    comment: 'Piloto Verde Banda en Servicio -H1 (%Q0.1)',
    branches: [{ id: 'cv_b12', contacts: [{ id: 'cv_c25', type: 'NO', address: '%M0.0' }] }],
    seriesContacts: [{ id: 'cv_c26', type: 'NO', address: '%Q0.0' }],
    coils: [{ id: 'cv_q10', type: 'OUT', address: '%Q0.1' }]
  },
  {
    id: 'cv_r7',
    number: 7,
    comment: 'Sensor Óptico -B1 + Temporizador TON_Desvio (1.0 s) -> Empujador -Y1 (%Q0.2)',
    branches: [
      {
        id: 'cv_b13',
        contacts: [
          { id: 'cv_c27', type: 'NO', address: '%M0.0' },
          { id: 'cv_c28', type: 'NO', address: '%I0.2' },
          { id: 'cv_c29', type: 'NO', address: '%I0.3' }
        ]
      },
      {
        id: 'cv_b14',
        contacts: [
          { id: 'cv_c30', type: 'NO', address: '%M0.0' },
          { id: 'cv_c31', type: 'NO', address: '%Q0.2' }
        ]
      }
    ],
    seriesContacts: [
      { id: 'cv_c32', type: 'NC', address: '%I0.1' },
      { id: 'cv_c33', type: 'NO', address: '%I8.3' },
      { id: 'cv_c34', type: 'NC', address: '%I0.4' }
    ],
    timer: { id: 'cv_tm1', name: 'TON_Desvio', type: 'TON', presetSeconds: 1.0 },
    coils: [
      { id: 'cv_q11', type: 'OUT', address: '%M0.1' },
      { id: 'cv_q12', type: 'OUT', address: '%Q0.2' }
    ]
  },
  {
    id: 'cv_r8',
    number: 8,
    comment: 'Piloto Alarma Emergencia D1 / Falla Térmica -H2 (%Q0.3)',
    branches: [
      { id: 'cv_b15', contacts: [{ id: 'cv_c35', type: 'NC', address: '%I8.3' }] },
      { id: 'cv_b16', contacts: [{ id: 'cv_c36', type: 'NO', address: '%I0.5' }] }
    ],
    seriesContacts: [],
    coils: [{ id: 'cv_q13', type: 'OUT', address: '%Q0.3' }]
  }
];

export const CONVEYOR_PROJECT_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Banda_Clasificadora',
  activeLanguage: 'LAD',
  tags: CONVEYOR_TAGS,
  rungs: CONVEYOR_RUNGS,
  sclCode: [
    '// Nivel 7: Proyecto Banda Transportadora Clasificadora GEMMA (OB1 — 8 Networks)',
    '// Autor: Simón Barrera Ruíz',
    '',
    transpileLadderToScl(CONVEYOR_RUNGS, CONVEYOR_TAGS).replace(/"([A-Za-z0-9_]+)"\.Q/g, '$1.Q')
  ].join('\n'),
  grafcetSteps: [
    { id: 0, name: 'A1 Reposo', isInitial: true, actionTag: '', actionLabel: 'GEMMA A1: Banda detenida — Esperando Marcha (-S1)' },
    { id: 1, name: 'F1 Banda', isInitial: false, actionTag: '%Q0.0', actionLabel: 'GEMMA F1: Motor cinta en marcha (-KM1 + -H1) escaneando -B1' },
    { id: 2, name: 'Desvio A+', isInitial: false, actionTag: '%Q0.2', actionLabel: 'Clasificar pieza detectada (-B1): Activar Empujador Y1 (A+)' },
    { id: 3, name: 'Retorno', isInitial: false, actionTag: '', actionLabel: 'Esperar retracción desviador a posición inicial (a0)' },
    { id: 4, name: 'D1 Emerg.', isInitial: false, actionTag: '%Q0.3', actionLabel: 'GEMMA D1: Paro de Emergencia / Falla Térmica (-H2)' },
    { id: 5, name: 'A6 Rearme', isInitial: false, actionTag: '', actionLabel: 'GEMMA A6: Rearme y retorno a condiciones iniciales' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND NOT %I0.1 AND %I8.3 AND NOT %I0.5', label: 'Marcha (-S1) · Seguridad OK' },
    { id: 2, fromStep: 1, toStep: 2, condition: '%I0.2 AND %I0.3 AND NOT %I0.1 AND %I8.3', label: 'Pieza en -B1 · a0' },
    { id: 3, fromStep: 2, toStep: 3, condition: '%I0.4', label: 'Desviador extendido (a1)' },
    { id: 4, fromStep: 3, toStep: 1, condition: '%I0.3 AND NOT %I0.1 AND %I8.3', label: 'Desviador en origen (a0)' },
    { id: 5, fromStep: 1, toStep: 0, condition: '%I0.1', label: 'Paro general (-S0)' },
    { id: 6, fromStep: 2, toStep: 0, condition: '%I0.1', label: 'Paro inmediato en desvío (-S0)' },
    { id: 7, fromStep: 3, toStep: 0, condition: '%I0.1', label: 'Paro inmediato en retorno (-S0)' },
    { id: 8, fromStep: 1, toStep: 4, condition: 'NOT %I8.3 OR %I0.5', label: 'Emergencia D1 / Térmico' },
    { id: 9, fromStep: 4, toStep: 5, condition: 'NOT %I8.4 AND %I8.3 AND NOT %I0.5', label: 'Rearme (-RecFa)' },
    { id: 10, fromStep: 5, toStep: 0, condition: '%I0.3', label: 'Condiciones iniciales a0 OK' }
  ]
};

// ============================================================================
// NIVEL 8: PROYECTO FINAL — PLANTA EMBOTELLADORA INDUSTRIAL GEMMA (S7-1200)
// ============================================================================
export const BOTTLING_GEMMA_CIRCUIT: CircuitDocument = {
  version: '2.1.0',
  gridSize: 20,
  titleBlock: {
    title: 'Embotelladora GEMMA 5 Cilindros (S7-1200)',
    project: 'Planta Embotelladora Electroneumática — Guía GEMMA',
    author: 'Simón Barrera Ruíz',
    date: '2026-11-24',
    sheet: '1/1',
    scale: '1:1',
    revision: '3.0',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- RÓTULOS DE ZONA CAD ----------------
    { id: 'txt_inputs', type: 'cad_text', tag: 'ENTRADAS GEMMA & SENSORES DE BOTELLA', x: 6, y: 2, rotation: 0 },
    { id: 'txt_plc', type: 'cad_text', tag: 'PLC SIEMENS S7-1200 CPU 1214C + SM 1223', x: 7, y: 12, rotation: 0 },
    { id: 'txt_actuators', type: 'cad_text', tag: 'ELECTROVÁLVULAS 5/2 & TORRETA GEMMA', x: 6, y: 23, rotation: 0 },
    { id: 'txt_plant', type: 'cad_text', tag: '5 CILINDROS (A, B, C, E, G) + D+ / F+', x: 64, y: 2, rotation: 0 },

    // ---------------- ALIMENTACIÓN 24V DC ----------------
    { id: 'emb_dc', type: 'power_dc', tag: '24VDC', x: 2, y: 3, rotation: 0 },

    // ---------------- ENTRADAS GEMMA & SENSORES DE BOTELLA ----------------
    { id: 'btn_start', type: 'button_no', tag: '-March', plcAddress: '%I0.0', x: 9, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'btn_es', type: 'emergency_stop', tag: '-PE', plcAddress: '%I8.3', x: 14, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'btn_rearm', type: 'button_no', tag: '-RecFa', plcAddress: '%I8.4', x: 19, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'btn_cl', type: 'button_no', tag: '-CL', plcAddress: '%I8.5', x: 24, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'btn_et', type: 'button_no', tag: '-ET', plcAddress: '%I8.6', x: 29, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'btn_man', type: 'button_no', tag: '-Man', plcAddress: '%I8.0', x: 34, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'btn_dcy', type: 'button_no', tag: '-Dcy', plcAddress: '%I8.1', x: 39, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'btn_bp', type: 'button_no', tag: '-Bp', plcAddress: '%I8.2', x: 44, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'cp1', type: 'limit_switch_no', tag: 'CP1', plcAddress: '%I1.3', x: 49, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'cp2', type: 'limit_switch_no', tag: 'CP2', plcAddress: '%I1.4', x: 54, y: 7, rotation: 0, state: { isActuated: false } },
    { id: 'cp3', type: 'limit_switch_no', tag: 'CP3', plcAddress: '%I1.5', x: 59, y: 7, rotation: 0, state: { isActuated: false } },

    // ---------------- PLC SIEMENS S7-1200 CPU 1214C + MÓDULOS SM 1223 ----------------
    { id: 'emb_cpu', type: 'plc_cpu_s71200', tag: 'PLC1', x: 7, y: 15, rotation: 0 },
    { id: 'emb_sm_di1', type: 'plc_input_module', tag: 'SM1223_DI1', x: 20, y: 16, rotation: 0 },
    { id: 'emb_sm_di2', type: 'plc_input_module', tag: 'SM1223_DI2', x: 32, y: 16, rotation: 0 },
    { id: 'emb_sm_di3', type: 'plc_input_module', tag: 'SM1223_DI3', x: 44, y: 16, rotation: 0 },
    { id: 'emb_sm_di4', type: 'plc_input_module', tag: 'SM1223_DI4', x: 56, y: 16, rotation: 0 },

    // ---------------- ELECTROVÁLVULAS 5/2 BIESTABLES & SALIDAS MONOESTABLES ----------------
    { id: 'valve_a', type: 'solenoid_valve_5_2', tag: '-A', plcAddress: '%Q0.0', x: 6, y: 26, rotation: 0 },
    { id: 'valve_b', type: 'solenoid_valve_5_2', tag: '-B', plcAddress: '%Q0.2', x: 16, y: 26, rotation: 0 },
    { id: 'valve_c', type: 'solenoid_valve_5_2', tag: '-C', plcAddress: '%Q0.4', x: 26, y: 26, rotation: 0 },
    { id: 'valve_e', type: 'solenoid_valve_5_2', tag: '-E', plcAddress: '%Q0.7', x: 36, y: 26, rotation: 0 },
    { id: 'valve_g', type: 'solenoid_valve_5_2', tag: '-G', plcAddress: '%Q8.0', x: 46, y: 26, rotation: 0 },
    { id: 'coil_d', type: 'coil_contactor', tag: '-D+', plcAddress: '%Q0.6', x: 56, y: 26, rotation: 0 },
    { id: 'coil_f', type: 'coil_contactor', tag: '-F+', plcAddress: '%Q1.1', x: 62, y: 26, rotation: 0 },

    // ---------------- TORRETA LUMINOSA GEMMA 3 COLORES ----------------
    { id: 'pilot_run', type: 'pilot_light_green', tag: '-H_RUN', plcAddress: '%Q8.2', x: 10, y: 33, rotation: 0 },
    { id: 'pilot_man', type: 'pilot_light_yellow', tag: '-H_MAN', plcAddress: '%Q8.3', x: 20, y: 33, rotation: 0 },
    { id: 'pilot_pe', type: 'pilot_light_red', tag: '-H_PE', plcAddress: '%Q8.4', x: 30, y: 33, rotation: 0 },

    // ---------------- PLANTA ELECTRONEUMÁTICA: 5 CILINDROS DOBLE EFECTO ----------------
    { id: 'cyl_a', type: 'pneumatic_cylinder_da', tag: '-A', x: 70, y: 4, rotation: 0, state: { pistonPos: 0 } },
    { id: 'cyl_b', type: 'pneumatic_cylinder_da', tag: '-B', x: 70, y: 9, rotation: 0, state: { pistonPos: 0 } },
    { id: 'cyl_c', type: 'pneumatic_cylinder_da', tag: '-C', x: 70, y: 14, rotation: 0, state: { pistonPos: 0 } },
    { id: 'cyl_e', type: 'pneumatic_cylinder_da', tag: '-E', x: 70, y: 19, rotation: 0, state: { pistonPos: 0 } },
    { id: 'cyl_g', type: 'pneumatic_cylinder_da', tag: '-G', x: 70, y: 24, rotation: 0, state: { pistonPos: 0 } }
  ],
  wires: [
    // ---------------- BUS +24V DC SUPERIOR (POS=3,5) ----------------
    { id: 'emb_dc1', fromX: 3, fromY: 5, toX: 3, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_dc2', fromX: 3, fromY: 6, toX: 3, toY: 15, wireType: 'dc_pos' },
    { id: 'emb_dc3', fromX: 3, fromY: 15, toX: 3, toY: 21, wireType: 'dc_pos' },
    { id: 'emb_dc4', fromX: 3, fromY: 15, toX: 8, toY: 15, wireType: 'dc_pos' },
    { id: 'emb_dc5', fromX: 3, fromY: 21, toX: 8, toY: 21, wireType: 'dc_pos' },

    // Carril +24V DC hacia las 11 entradas (y=6)
    { id: 'emb_p_01', fromX: 3, fromY: 6, toX: 10, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_02', fromX: 10, fromY: 6, toX: 15, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_03', fromX: 15, fromY: 6, toX: 20, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_04', fromX: 20, fromY: 6, toX: 25, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_05', fromX: 25, fromY: 6, toX: 30, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_06', fromX: 30, fromY: 6, toX: 35, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_07', fromX: 35, fromY: 6, toX: 40, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_08', fromX: 40, fromY: 6, toX: 45, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_09', fromX: 45, fromY: 6, toX: 50, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_10', fromX: 50, fromY: 6, toX: 55, toY: 6, wireType: 'dc_pos' },
    { id: 'emb_p_11', fromX: 55, fromY: 6, toX: 60, toY: 6, wireType: 'dc_pos' },

    // Bajadas +24V DC a borne superior de cada pulsador/sensor (y=6 -> y=7)
    { id: 'emb_d_01', fromX: 10, fromY: 6, toX: 10, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_02', fromX: 15, fromY: 6, toX: 15, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_03', fromX: 20, fromY: 6, toX: 20, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_04', fromX: 25, fromY: 6, toX: 25, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_05', fromX: 30, fromY: 6, toX: 30, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_06', fromX: 35, fromY: 6, toX: 35, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_07', fromX: 40, fromY: 6, toX: 40, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_08', fromX: 45, fromY: 6, toX: 45, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_09', fromX: 50, fromY: 6, toX: 50, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_10', fromX: 55, fromY: 6, toX: 55, toY: 7, wireType: 'dc_pos' },
    { id: 'emb_d_11', fromX: 60, fromY: 6, toX: 60, toY: 7, wireType: 'dc_pos' },

    // ---------------- CABLEADO DE ENTRADAS A PLC1 & SM1223 ----------------
    // -March (%I0.0) -> PLC1:I0
    { id: 'emb_in_0', fromX: 10, fromY: 10, toX: 10, toY: 15, wireType: 'control' },

    // -PE (%I8.3), -RecFa (%I8.4), -CL (%I8.5) -> SM1223_DI1
    { id: 'emb_in_1a', fromX: 15, fromY: 10, toX: 15, toY: 13, wireType: 'control' },
    { id: 'emb_in_1b', fromX: 15, fromY: 13, toX: 22, toY: 13, wireType: 'control' },
    { id: 'emb_in_1c', fromX: 22, fromY: 13, toX: 22, toY: 16, wireType: 'control' },

    { id: 'emb_in_2a', fromX: 20, fromY: 10, toX: 20, toY: 12, wireType: 'control' },
    { id: 'emb_in_2b', fromX: 20, fromY: 12, toX: 23, toY: 12, wireType: 'control' },
    { id: 'emb_in_2c', fromX: 23, fromY: 12, toX: 23, toY: 16, wireType: 'control' },

    { id: 'emb_in_3a', fromX: 25, fromY: 10, toX: 25, toY: 11, wireType: 'control' },
    { id: 'emb_in_3b', fromX: 25, fromY: 11, toX: 24, toY: 11, wireType: 'control' },
    { id: 'emb_in_3c', fromX: 24, fromY: 11, toX: 24, toY: 16, wireType: 'control' },

    // -ET (%I8.6), -Man (%I8.0), -Dcy (%I8.1) -> SM1223_DI2
    { id: 'emb_in_4a', fromX: 30, fromY: 10, toX: 30, toY: 13, wireType: 'control' },
    { id: 'emb_in_4b', fromX: 30, fromY: 13, toX: 34, toY: 13, wireType: 'control' },
    { id: 'emb_in_4c', fromX: 34, fromY: 13, toX: 34, toY: 16, wireType: 'control' },

    { id: 'emb_in_5', fromX: 35, fromY: 10, toX: 35, toY: 16, wireType: 'control' },

    { id: 'emb_in_6a', fromX: 40, fromY: 10, toX: 40, toY: 12, wireType: 'control' },
    { id: 'emb_in_6b', fromX: 40, fromY: 12, toX: 36, toY: 12, wireType: 'control' },
    { id: 'emb_in_6c', fromX: 36, fromY: 12, toX: 36, toY: 16, wireType: 'control' },

    // -Bp (%I8.2), CP1 (%I1.3), CP2 (%I1.4) -> SM1223_DI3
    { id: 'emb_in_7a', fromX: 45, fromY: 10, toX: 45, toY: 13, wireType: 'control' },
    { id: 'emb_in_7b', fromX: 45, fromY: 13, toX: 46, toY: 13, wireType: 'control' },
    { id: 'emb_in_7c', fromX: 46, fromY: 13, toX: 46, toY: 16, wireType: 'control' },

    { id: 'emb_in_8a', fromX: 50, fromY: 10, toX: 50, toY: 12, wireType: 'control' },
    { id: 'emb_in_8b', fromX: 50, fromY: 12, toX: 47, toY: 12, wireType: 'control' },
    { id: 'emb_in_8c', fromX: 47, fromY: 12, toX: 47, toY: 16, wireType: 'control' },

    { id: 'emb_in_9a', fromX: 55, fromY: 10, toX: 55, toY: 11, wireType: 'control' },
    { id: 'emb_in_9b', fromX: 55, fromY: 11, toX: 48, toY: 11, wireType: 'control' },
    { id: 'emb_in_9c', fromX: 48, fromY: 11, toX: 48, toY: 16, wireType: 'control' },

    // CP3 (%I1.5) -> SM1223_DI4
    { id: 'emb_in_10a', fromX: 60, fromY: 10, toX: 60, toY: 12, wireType: 'control' },
    { id: 'emb_in_10b', fromX: 60, fromY: 12, toX: 58, toY: 12, wireType: 'control' },
    { id: 'emb_in_10c', fromX: 58, fromY: 12, toX: 58, toY: 16, wireType: 'control' },

    // ---------------- SALIDAS PLC1 A ELECTROVÁLVULAS -A y -B ----------------
    { id: 'emb_q0a', fromX: 10, fromY: 21, toX: 10, toY: 22, wireType: 'control' },
    { id: 'emb_q0b', fromX: 10, fromY: 22, toX: 7, toY: 22, wireType: 'control' },
    { id: 'emb_q0c', fromX: 7, fromY: 22, toX: 7, toY: 26, wireType: 'control' },

    { id: 'emb_q1', fromX: 11, fromY: 21, toX: 11, toY: 26, wireType: 'control' },

    { id: 'emb_q2a', fromX: 12, fromY: 21, toX: 12, toY: 23, wireType: 'control' },
    { id: 'emb_q2b', fromX: 12, fromY: 23, toX: 17, toY: 23, wireType: 'control' },
    { id: 'emb_q2c', fromX: 17, fromY: 23, toX: 17, toY: 26, wireType: 'control' },

    { id: 'emb_q3a', fromX: 13, fromY: 21, toX: 13, toY: 22, wireType: 'control' },
    { id: 'emb_q3b', fromX: 13, fromY: 22, toX: 21, toY: 22, wireType: 'control' },
    { id: 'emb_q3c', fromX: 21, fromY: 22, toX: 21, toY: 26, wireType: 'control' },

    // ---------------- RETORNO 0V DC INFERIOR (NEG=4,5) ----------------
    { id: 'emb_n_m1', fromX: 4, fromY: 5, toX: 4, toY: 14, wireType: 'dc_neg' },
    { id: 'emb_n_m2', fromX: 4, fromY: 14, toX: 9, toY: 14, wireType: 'dc_neg' },
    { id: 'emb_n_m3', fromX: 9, fromY: 14, toX: 9, toY: 15, wireType: 'dc_neg' },

    // Troncal 0V DC a fila de válvulas (y=30) y torreta (y=37)
    { id: 'emb_n_t1', fromX: 4, fromY: 14, toX: 4, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_n_t2', fromX: 4, fromY: 30, toX: 4, toY: 37, wireType: 'dc_neg' },

    // Bus 0V DC de electroválvulas y bobinas monoestables (y=30)
    { id: 'emb_nv_01', fromX: 4, fromY: 30, toX: 7, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_02', fromX: 7, fromY: 30, toX: 11, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_03', fromX: 11, fromY: 30, toX: 17, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_04', fromX: 17, fromY: 30, toX: 21, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_05', fromX: 21, fromY: 30, toX: 27, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_06', fromX: 27, fromY: 30, toX: 31, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_07', fromX: 31, fromY: 30, toX: 37, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_08', fromX: 37, fromY: 30, toX: 41, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_09', fromX: 41, fromY: 30, toX: 47, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_10', fromX: 47, fromY: 30, toX: 51, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_11', fromX: 51, fromY: 30, toX: 57, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_nv_12', fromX: 57, fromY: 30, toX: 63, toY: 30, wireType: 'dc_neg' },

    // Conexiones de bornas A2/Y1_A2/Y2_A2 a bus 0V (y=29 -> y=30)
    { id: 'emb_vc_01', fromX: 7, fromY: 29, toX: 7, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_02', fromX: 11, fromY: 29, toX: 11, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_03', fromX: 17, fromY: 29, toX: 17, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_04', fromX: 21, fromY: 29, toX: 21, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_05', fromX: 27, fromY: 29, toX: 27, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_06', fromX: 31, fromY: 29, toX: 31, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_07', fromX: 37, fromY: 29, toX: 37, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_08', fromX: 41, fromY: 29, toX: 41, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_09', fromX: 47, fromY: 29, toX: 47, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_10', fromX: 51, fromY: 29, toX: 51, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_11', fromX: 57, fromY: 29, toX: 57, toY: 30, wireType: 'dc_neg' },
    { id: 'emb_vc_12', fromX: 63, fromY: 29, toX: 63, toY: 30, wireType: 'dc_neg' },

    // Bus 0V DC de torreta luminosa GEMMA (y=37)
    { id: 'emb_nt_1', fromX: 4, fromY: 37, toX: 11, toY: 37, wireType: 'dc_neg' },
    { id: 'emb_nt_2', fromX: 11, fromY: 37, toX: 21, toY: 37, wireType: 'dc_neg' },
    { id: 'emb_nt_3', fromX: 21, fromY: 37, toX: 31, toY: 37, wireType: 'dc_neg' },
    { id: 'emb_nt_4', fromX: 11, fromY: 36, toX: 11, toY: 37, wireType: 'dc_neg' },
    { id: 'emb_nt_5', fromX: 21, fromY: 36, toX: 21, toY: 37, wireType: 'dc_neg' },
    { id: 'emb_nt_6', fromX: 31, fromY: 36, toX: 31, toY: 37, wireType: 'dc_neg' }
  ],
  junctions: [
    { id: 'emb_j1', x: 3, y: 6 },
    { id: 'emb_j2', x: 3, y: 15 },
    { id: 'emb_j3', x: 10, y: 6 },
    { id: 'emb_j4', x: 15, y: 6 },
    { id: 'emb_j5', x: 20, y: 6 },
    { id: 'emb_j6', x: 25, y: 6 },
    { id: 'emb_j7', x: 30, y: 6 },
    { id: 'emb_j8', x: 35, y: 6 },
    { id: 'emb_j9', x: 40, y: 6 },
    { id: 'emb_j10', x: 45, y: 6 },
    { id: 'emb_j11', x: 50, y: 6 },
    { id: 'emb_j12', x: 55, y: 6 },
    { id: 'emb_jn1', x: 4, y: 14 },
    { id: 'emb_jn2', x: 4, y: 30 },
    { id: 'emb_jn3', x: 7, y: 30 },
    { id: 'emb_jn4', x: 11, y: 30 },
    { id: 'emb_jn5', x: 17, y: 30 },
    { id: 'emb_jn6', x: 21, y: 30 },
    { id: 'emb_jn7', x: 27, y: 30 },
    { id: 'emb_jn8', x: 31, y: 30 },
    { id: 'emb_jn9', x: 37, y: 30 },
    { id: 'emb_jn10', x: 41, y: 30 },
    { id: 'emb_jn11', x: 47, y: 30 },
    { id: 'emb_jn12', x: 51, y: 30 },
    { id: 'emb_jn13', x: 57, y: 30 },
    { id: 'emb_jn14', x: 11, y: 37 },
    { id: 'emb_jn15', x: 21, y: 37 }
  ]
};

const BOTTLING_GEMMA_TAGS: TiaTag[] = [
  // Entradas Digitales Físicas
  { address: '%I0.0', name: 'I_March', dataType: 'Bool', schematicTag: '-March', comment: 'Interruptor-1 (NA): STOP/MARCHA general' },
  { address: '%I0.1', name: 'I_a0', dataType: 'Bool', schematicTag: 'a0', comment: 'Cilindro 1 (A) Sensor Magnetico S1 - Atras (a0)' },
  { address: '%I0.2', name: 'I_a1', dataType: 'Bool', schematicTag: 'a1', comment: 'Cilindro 1 (A) Sensor Magnetico S2 - Adelante (a1)' },
  { address: '%I0.3', name: 'I_b0', dataType: 'Bool', schematicTag: 'b0', comment: 'Cilindro 2 (B) Sensor Magnetico S1 - Atras (b0)' },
  { address: '%I0.4', name: 'I_b1', dataType: 'Bool', schematicTag: 'b1', comment: 'Cilindro 2 (B) Sensor Magnetico S2 - Adelante (b1)' },
  { address: '%I0.5', name: 'I_c0', dataType: 'Bool', schematicTag: 'c0', comment: 'Cilindro 3 (C) Sensor Magnetico S1 - Atras (c0)' },
  { address: '%I0.6', name: 'I_c1', dataType: 'Bool', schematicTag: 'c1', comment: 'Cilindro 3 (C) Sensor Magnetico S2 - Adelante (c1)' },
  { address: '%I0.7', name: 'I_e0', dataType: 'Bool', schematicTag: 'e0', comment: 'Cilindro 4 (E) Sensor Magnetico S1 - Arriba (e0)' },
  { address: '%I1.0', name: 'I_e1', dataType: 'Bool', schematicTag: 'e1', comment: 'Cilindro 4 (E) Sensor Magnetico S2 - Abajo (e1)' },
  { address: '%I1.1', name: 'I_g0', dataType: 'Bool', schematicTag: 'g0', comment: 'Cilindro 5 (G) Sensor Magnetico S1 - Atras (g0)' },
  { address: '%I1.2', name: 'I_g1', dataType: 'Bool', schematicTag: 'g1', comment: 'Cilindro 5 (G) Sensor Magnetico S2 - Adelante (g1)' },
  { address: '%I1.3', name: 'I_CP1', dataType: 'Bool', schematicTag: 'CP1', comment: 'Sensor Botella Estacion 1 Carga' },
  { address: '%I1.4', name: 'I_CP2', dataType: 'Bool', schematicTag: 'CP2', comment: 'Sensor Botella Estacion 2 Llenado' },
  { address: '%I1.5', name: 'I_CP3', dataType: 'Bool', schematicTag: 'CP3', comment: 'Sensor Botella Estacion 3 Taponado' },
  { address: '%I8.0', name: 'I_Man', dataType: 'Bool', schematicTag: '-Man', comment: 'Interruptor-2 (NA): Selector Modo Manual F4 (0->dispara A6)' },
  { address: '%I8.1', name: 'I_Dcy', dataType: 'Bool', schematicTag: '-Dcy', comment: 'Pulsador NA: Pulso Inicio Ciclo (CL / A2)' },
  { address: '%I8.2', name: 'I_Bp', dataType: 'Bool', schematicTag: '-Bp', comment: 'Pulsador NA: Pulso Paso a Paso (ET / F5)' },
  { address: '%I8.3', name: 'I_PE_NC', dataType: 'Bool', schematicTag: '-PE', comment: 'Seta Emergencia (NC): Parada Emergencia D1 (0=EMERG)' },
  { address: '%I8.4', name: 'I_RecFa_NC', dataType: 'Bool', schematicTag: '-RecFa', comment: 'Pulsador Rearme Fallas D2 / A6' },
  { address: '%I8.5', name: 'I_CL', dataType: 'Bool', schematicTag: '-CL', comment: 'Selector Ciclo a Ciclo A2 (0+0=AU Automatico, 1=CL)' },
  { address: '%I8.6', name: 'I_ET', dataType: 'Bool', schematicTag: '-ET', comment: 'Selector Etapa a Etapa F5 (0+0=AU Automatico, 1=ET)' },

  // Salidas Digitales Físicas (Electroválvulas 5/2, V7, V8 y Torreta)
  { address: '%Q0.0', name: 'Q_A_MAS', dataType: 'Bool', schematicTag: '-A:Y1', comment: 'A+ | V1 Izq (14) 5/2 Biestable: Sale Cilindro 1 Carga' },
  { address: '%Q0.1', name: 'Q_A_MEN', dataType: 'Bool', schematicTag: '-A:Y2', comment: 'A- | V1 Der (12) 5/2 Biestable: Entra Cilindro 1 Carga' },
  { address: '%Q0.2', name: 'Q_B_MAS', dataType: 'Bool', schematicTag: '-B:Y1', comment: 'B+ | V2 Izq (14) 5/2 Biestable: Sale Cilindro 2 Banda' },
  { address: '%Q0.3', name: 'Q_B_MEN', dataType: 'Bool', schematicTag: '-B:Y2', comment: 'B- | V2 Der (12) 5/2 Biestable: Entra Cilindro 2 Banda' },
  { address: '%Q0.4', name: 'Q_C_MAS', dataType: 'Bool', schematicTag: '-C:Y1', comment: 'C+ | V3 Izq (14) 5/2 Biestable: Sale Cilindro 3 Llenado' },
  { address: '%Q0.5', name: 'Q_C_MEN', dataType: 'Bool', schematicTag: '-C:Y2', comment: 'C- | V3 Der (12) 5/2 Biestable: Entra Cilindro 3 Llenado' },
  { address: '%Q0.6', name: 'Q_D_MAS', dataType: 'Bool', schematicTag: '-D+', comment: 'D+ | V7 (14) Monoestable: Valvula Descarga Dosis' },
  { address: '%Q0.7', name: 'Q_E_MAS', dataType: 'Bool', schematicTag: '-E:Y1', comment: 'E+ | V4 Izq (14) 5/2 Biestable: Baja Cabezal Cilindro 4' },
  { address: '%Q1.0', name: 'Q_E_MEN', dataType: 'Bool', schematicTag: '-E:Y2', comment: 'E- | V4 Der (12) 5/2 Biestable: Sube Cabezal Cilindro 4' },
  { address: '%Q1.1', name: 'Q_F_MAS', dataType: 'Bool', schematicTag: '-F+', comment: 'F+ | V8 (14) Monoestable: Motor Neumatico Roscado' },
  { address: '%Q8.0', name: 'Q_G_MAS', dataType: 'Bool', schematicTag: '-G:Y1', comment: 'G+ | V5 Izq (14) 5/2 Biestable: Sale Presentador Cilindro 5' },
  { address: '%Q8.1', name: 'Q_G_MEN', dataType: 'Bool', schematicTag: '-G:Y2', comment: 'G- | V5 Der (12) 5/2 Biestable: Entra Presentador Cilindro 5' },
  { address: '%Q8.2', name: 'Q_H_RUN', dataType: 'Bool', schematicTag: '-H_RUN', comment: 'Torreta G (Verde): Sistema Normal / Produccion (E31 y no E27)' },
  { address: '%Q8.3', name: 'Q_H_MAN', dataType: 'Bool', schematicTag: '-H_MAN', comment: 'Torreta Y (Amarillo): Modo Manual (E27) o Falla (FG)' },
  { address: '%Q8.4', name: 'Q_H_PE', dataType: 'Bool', schematicTag: '-H_PE', comment: 'Torreta R (Rojo): Parada de Emergencia (PE_A) o Bloqueo (E32)' },

  // Etapas GRAFCET Producción (E0..E18)
  { address: '%M0.0', name: 'E0', dataType: 'Bool', comment: 'Etapa 0: Reposo inicial A1 (espera arranque)' },
  { address: '%M0.1', name: 'E1', dataType: 'Bool', comment: 'Etapa 1: Avance banda de embotellado (B+)' },
  { address: '%M0.2', name: 'E2', dataType: 'Bool', comment: 'Etapa 2: Inicio Estacion 1 Carga (evalua CP1)' },
  { address: '%M0.3', name: 'E3', dataType: 'Bool', comment: 'Etapa 3: Est. 1 con botella (A+ y B- simultaneo)' },
  { address: '%M0.4', name: 'E4', dataType: 'Bool', comment: 'Etapa 4: Est. 1 retorno empujador (A-)' },
  { address: '%M0.5', name: 'E5', dataType: 'Bool', comment: 'Etapa 5: Est. 1 sin botella (solo B-)' },
  { address: '%M0.6', name: 'E6', dataType: 'Bool', comment: 'Etapa 6: Espera sincronizacion Estacion 1' },
  { address: '%M0.7', name: 'E7', dataType: 'Bool', comment: 'Etapa 7: Inicio Estacion 2 Llenado (evalua CP2)' },
  { address: '%M1.0', name: 'E8', dataType: 'Bool', comment: 'Etapa 8: Est. 2 dosificacion y descarga (C+ y D+)' },
  { address: '%M1.1', name: 'E9', dataType: 'Bool', comment: 'Etapa 9: Est. 2 recarga dosificador (C-)' },
  { address: '%M1.2', name: 'E10', dataType: 'Bool', comment: 'Etapa 10: Espera sincronizacion Estacion 2' },
  { address: '%M1.3', name: 'E11', dataType: 'Bool', comment: 'Etapa 11: Inicio Estacion 3 Taponado (evalua CP3)' },
  { address: '%M1.4', name: 'E12', dataType: 'Bool', comment: 'Etapa 12: Est. 3 presenta tapon (G+)' },
  { address: '%M1.5', name: 'E13', dataType: 'Bool', comment: 'Etapa 13: Est. 3 coloca tapon (E+)' },
  { address: '%M1.6', name: 'E14', dataType: 'Bool', comment: 'Etapa 14: Est. 3 sube cabezal (E-)' },
  { address: '%M1.7', name: 'E15', dataType: 'Bool', comment: 'Etapa 15: Est. 3 retira presentador (G-)' },
  { address: '%M2.0', name: 'E16', dataType: 'Bool', comment: 'Etapa 16: Est. 3 baja y rosca tapon (E+ y F+)' },
  { address: '%M2.1', name: 'E17', dataType: 'Bool', comment: 'Etapa 17: Est. 3 sube cabezal final (E-)' },
  { address: '%M2.2', name: 'E18', dataType: 'Bool', comment: 'Etapa 18: Espera sincronizacion Estacion 3' },

  // Etapas GRAFCET Conducción & Seguridad (E20..E32)
  { address: '%M3.0', name: 'E20', dataType: 'Bool', comment: 'Etapa 20: Inicial Conduccion GEMMA' },
  { address: '%M3.1', name: 'E21', dataType: 'Bool', comment: 'Etapa 21: A6 Retorno automatico A-' },
  { address: '%M3.2', name: 'E22', dataType: 'Bool', comment: 'Etapa 22: A6 Retorno automatico B-' },
  { address: '%M3.3', name: 'E23', dataType: 'Bool', comment: 'Etapa 23: A6 Retorno automatico C-' },
  { address: '%M3.4', name: 'E24', dataType: 'Bool', comment: 'Etapa 24: A6 Retorno automatico E-' },
  { address: '%M3.5', name: 'E25', dataType: 'Bool', comment: 'Etapa 25: A6 Retorno automatico G-' },
  { address: '%M3.6', name: 'E26', dataType: 'Bool', comment: 'Etapa 26: Condiciones Iniciales OK (habilita Produccion)' },
  { address: '%M3.7', name: 'E27', dataType: 'Bool', comment: 'Etapa 27: Modo Manual F4 + Forzado F-G00' },
  { address: '%M4.0', name: 'E30', dataType: 'Bool', comment: 'Etapa 30: Inicial Seguridad' },
  { address: '%M4.1', name: 'E31', dataType: 'Bool', comment: 'Etapa 31: Sistema Normal OK (habilita Produccion y Conduccion)' },
  { address: '%M4.2', name: 'E32', dataType: 'Bool', comment: 'Etapa 32: Emergencia D1 / Falla D2 + Forzado F-G00 y F-2020' },

  // Fallas de Tiempo Excedido (>4s TON)
  { address: '%M5.0', name: 'TA_MAS', dataType: 'Bool', comment: 'Falla tiempo excedido A+ (>4s sin a1)' },
  { address: '%M5.1', name: 'TA_MEN', dataType: 'Bool', comment: 'Falla tiempo excedido A- (>4s sin a0)' },
  { address: '%M5.2', name: 'TB_MAS', dataType: 'Bool', comment: 'Falla tiempo excedido B+ (>4s sin b1)' },
  { address: '%M5.3', name: 'TB_MEN', dataType: 'Bool', comment: 'Falla tiempo excedido B- (>4s sin b0)' },
  { address: '%M5.4', name: 'TC_MAS', dataType: 'Bool', comment: 'Falla tiempo excedido C+ (>4s sin c1)' },
  { address: '%M5.5', name: 'TC_MEN', dataType: 'Bool', comment: 'Falla tiempo excedido C- (>4s sin c0)' },
  { address: '%M5.6', name: 'TE_MAS', dataType: 'Bool', comment: 'Falla tiempo excedido E+ (>4s sin e1)' },
  { address: '%M5.7', name: 'TE_MEN', dataType: 'Bool', comment: 'Falla tiempo excedido E- (>4s sin e0)' },
  { address: '%M6.0', name: 'TG_MAS', dataType: 'Bool', comment: 'Falla tiempo excedido G+ (>4s sin g1)' },
  { address: '%M6.1', name: 'TG_MEN', dataType: 'Bool', comment: 'Falla tiempo excedido G- (>4s sin g0)' },

  // Comandos Manuales F4
  { address: '%M7.0', name: 'PA_MAS', dataType: 'Bool', comment: 'Manual F4: Sacar A+' },
  { address: '%M7.1', name: 'PA_MEN', dataType: 'Bool', comment: 'Manual F4: Entrar A-' },
  { address: '%M7.2', name: 'PB_MAS', dataType: 'Bool', comment: 'Manual F4: Sacar B+' },
  { address: '%M7.3', name: 'PB_MEN', dataType: 'Bool', comment: 'Manual F4: Entrar B-' },
  { address: '%M7.4', name: 'PC_MAS', dataType: 'Bool', comment: 'Manual F4: Sacar C+' },
  { address: '%M7.5', name: 'PC_MEN', dataType: 'Bool', comment: 'Manual F4: Entrar C-' },
  { address: '%M7.6', name: 'PD_MAS', dataType: 'Bool', comment: 'Manual F4: Abrir Valvula D+' },
  { address: '%M7.7', name: 'PE_MAS', dataType: 'Bool', comment: 'Manual F4: Bajar E+' },
  { address: '%M8.0', name: 'PE_MEN', dataType: 'Bool', comment: 'Manual F4: Subir E-' },
  { address: '%M8.1', name: 'PF_MAS', dataType: 'Bool', comment: 'Manual F4: Girar Motor F+' },
  { address: '%M8.2', name: 'PG_MAS', dataType: 'Bool', comment: 'Manual F4: Sacar G+' },
  { address: '%M8.3', name: 'PG_MEN', dataType: 'Bool', comment: 'Manual F4: Entrar G-' },

  // Marcas HMI / Acondicionamiento / Flancos / GEMMA
  { address: '%M10.0', name: 'M_March', dataType: 'Bool', comment: 'HMI / Watch Table OR: Marcha virtual' },
  { address: '%M10.1', name: 'M_Man', dataType: 'Bool', comment: 'HMI / Watch Table OR: Modo Manual virtual' },
  { address: '%M10.2', name: 'M_CL', dataType: 'Bool', comment: 'HMI / Watch Table OR: Seleccion Ciclo a Ciclo (CL)' },
  { address: '%M10.3', name: 'M_ET', dataType: 'Bool', comment: 'HMI / Watch Table OR: Seleccion Etapa a Etapa (ET)' },
  { address: '%M10.4', name: 'M_Dcy', dataType: 'Bool', comment: 'HMI / Watch Table OR: Pulso Dcy virtual' },
  { address: '%M10.5', name: 'M_Bp', dataType: 'Bool', comment: 'HMI / Watch Table OR: Pulso Bp virtual' },
  { address: '%M10.6', name: 'M_PE', dataType: 'Bool', comment: 'HMI / Watch Table OR: Disparo Emergencia virtual' },
  { address: '%M10.7', name: 'M_RecFa', dataType: 'Bool', comment: 'HMI / Watch Table OR: Rearme Fallas virtual' },
  { address: '%M11.0', name: 'M_CP1', dataType: 'Bool', comment: 'HMI / Watch Table OR: Botella presente en CP1' },
  { address: '%M11.1', name: 'M_CP2', dataType: 'Bool', comment: 'HMI / Watch Table OR: Botella presente en CP2' },
  { address: '%M11.2', name: 'M_CP3', dataType: 'Bool', comment: 'HMI / Watch Table OR: Botella presente en CP3' },
  { address: '%M11.3', name: 'M_IG_MAN', dataType: 'Bool', comment: 'Watch Table OR: Inicializacion General manual' },
  { address: '%M11.4', name: 'M_SIM_EG', dataType: 'Bool', comment: '0=5 pistones reales | 1=Emula E y G' },
  { address: '%M11.5', name: 'M_NO_PE_HW', dataType: 'Bool', comment: '0=Botones NC fisicos activos | 1=Ignora NC fisicos' },
  { address: '%M12.0', name: 'March_EF', dataType: 'Bool', comment: 'Marcha efectiva (I0.0 OR M_March)' },
  { address: '%M12.1', name: 'Man_EF', dataType: 'Bool', comment: 'Manual efectivo (I8.0 OR M_Man)' },
  { address: '%M12.2', name: 'CL_EF', dataType: 'Bool', comment: 'Modo Ciclo a Ciclo efectivo' },
  { address: '%M12.3', name: 'ET_EF', dataType: 'Bool', comment: 'Modo Etapa a Etapa efectivo' },
  { address: '%M12.4', name: 'AU_EF', dataType: 'Bool', comment: 'Modo Automatico efectivo (NOT CL_EF AND NOT ET_EF)' },
  { address: '%M12.5', name: 'CP1_EF', dataType: 'Bool', comment: 'Sensor CP1 efectivo (I1.3 OR M_CP1)' },
  { address: '%M12.6', name: 'CP2_EF', dataType: 'Bool', comment: 'Sensor CP2 efectivo (I1.4 OR M_CP2)' },
  { address: '%M12.7', name: 'CP3_EF', dataType: 'Bool', comment: 'Sensor CP3 efectivo (I1.5 OR M_CP3)' },
  { address: '%M13.0', name: 'e0_EF', dataType: 'Bool', comment: 'Sensor e0 efectivo' },
  { address: '%M13.1', name: 'e1_EF', dataType: 'Bool', comment: 'Sensor e1 efectivo' },
  { address: '%M13.2', name: 'g0_EF', dataType: 'Bool', comment: 'Sensor g0 efectivo' },
  { address: '%M13.3', name: 'g1_EF', dataType: 'Bool', comment: 'Sensor g1 efectivo' },
  { address: '%M13.4', name: 'RecFa_A', dataType: 'Bool', comment: 'Rearme Fallas activo' },
  { address: '%M14.0', name: 'M_Homing', dataType: 'Bool', comment: 'Solicitud retorno automatico GEMMA A6 (E21..E25->E26) tras Rearme' },
  { address: '%M50.0', name: 'Fbp', dataType: 'Bool', comment: 'Flanco positivo [P_TRIG] Bp' },
  { address: '%M50.1', name: 'Fdcy', dataType: 'Bool', comment: 'Flanco positivo [P_TRIG] Dcy' },
  { address: '%M50.2', name: 'P_ET', dataType: 'Bool', comment: 'Permiso de paso entre etapas' },
  { address: '%M50.3', name: 'M_ARR', dataType: 'Bool', comment: 'Permiso arranque GEMMA' },
  { address: '%M50.4', name: 'PE_A', dataType: 'Bool', comment: 'Emergencia D1 enclavada' },
  { address: '%M50.5', name: 'FG_1', dataType: 'Bool', comment: 'Agrupador fallas Est. 1 y 2' },
  { address: '%M50.6', name: 'FG', dataType: 'Bool', comment: 'Falla General D2 enclavada (reset con RecFa_A)' },
  { address: '%M50.7', name: 'IG', dataType: 'Bool', comment: 'Inicializacion General (Initial_Call OR M_IG_MAN)' },
  { address: '%M51.0', name: 'Initial_Call', dataType: 'Bool', comment: 'Bit FirstScan OB1' },
  { address: '%MW20', name: 'MW_CICLOS', dataType: 'Int', comment: 'Contador de ciclos completados de la Embotelladora' }
];

function buildBottling50Networks(): TiaLadderRung[] {
  const addrBySym = new Map<string, string>(BOTTLING_GEMMA_TAGS.map(t => [t.name, t.address]));
  let seq = 0;
  const resolve = (sym: string) => addrBySym.get(sym) ?? sym;
  const ct = (sym: string, neg = false) => ({
    id: `emb_c_${++seq}`,
    type: (neg ? 'NC' : 'NO') as 'NO' | 'NC',
    address: resolve(sym)
  });
  const br = (...items: Array<[string, boolean?]>) => ({
    id: `emb_b_${++seq}`,
    contacts: items.map(([sym, neg]) => ct(sym, Boolean(neg)))
  });
  const cl = (sym: string, type: 'OUT' | 'SET' | 'RESET' = 'OUT') => ({
    id: `emb_q_${++seq}`,
    type,
    address: resolve(sym)
  });
  const nw = (
    number: number,
    comment: string,
    branches: ReturnType<typeof br>[],
    series: Array<[string, boolean?]>,
    coils: Array<[string, ('OUT' | 'SET' | 'RESET')?]>,
    timerName?: string
  ): TiaLadderRung => ({
    id: `emb_nw_${number}`,
    number,
    comment,
    branches,
    seriesContacts: series.map(([sym, neg]) => ct(sym, Boolean(neg))),
    ...(timerName
      ? { timer: { id: `emb_tm_${number}`, name: timerName, type: 'TON' as const, presetSeconds: 4.0 } }
      : {}),
    coils: coils.map(([sym, t]) => cl(sym, t ?? 'OUT'))
  });

  const prodReset: Array<[string, boolean?]> = [['IG', true], ['E27', true], ['E32', true], ['RecFa_A', true]];
  const condReset: Array<[string, boolean?]> = [['IG', true], ['E32', true], ['RecFa_A', true]];

  return [
    // NW 01..04: Inicialización, Flancos y Acondicionamiento
    nw(1, 'NW 01 - Inicializacion General (IG)', [br(['Initial_Call']), br(['M_IG_MAN'])], [], [['IG']]),
    nw(2, 'NW 02 - Flanco Positivo [P_TRIG] Paso a Paso (Fbp)', [br(['I_Bp']), br(['M_Bp'])], [], [['Fbp']]),
    nw(3, 'NW 03 - Flanco Positivo [P_TRIG] Inicio de Ciclo (Fdcy)', [br(['I_Dcy']), br(['M_Dcy'])], [], [['Fdcy']]),
    nw(4, 'NW 04 - Acondicionamiento Entradas Fisicas + HMI (FC1_Acondicionamiento_HMI)', [br(['I_March']), br(['M_March'])], [], [['March_EF']]),

    // NW 05..23: GRAFCET Producción (E0..E18)
    nw(
      5,
      'NW 05 - [PRODUCCION] Etapa 0 (E0 - Reposo Inicial A1)',
      [
        br(['IG']),
        br(['E27']),
        br(['E32']),
        br(['RecFa_A']),
        br(['E6'], ['E10'], ['E18'], ['I_a0'], ['I_b0'], ['I_c0'], ['e0_EF'], ['g0_EF'], ['ET_EF', true]),
        br(['E6'], ['E10'], ['E18'], ['I_a0'], ['I_b0'], ['I_c0'], ['e0_EF'], ['g0_EF'], ['Fbp']),
        br(['E0'], ['E1', true])
      ],
      [],
      [['E0']]
    ),
    nw(
      6,
      'NW 06 - [PRODUCCION] Etapa 1 (E1 - Avance Banda B+ | Arranque GEMMA + De Morgan AND)',
      [
        br(['E0'], ['March_EF'], ['AU_EF'], ['E26'], ['E31'], ['E6', true]),
        br(['E0'], ['March_EF'], ['CL_EF'], ['Fdcy'], ['E26'], ['E31'], ['E6', true]),
        br(['E0'], ['March_EF'], ['ET_EF'], ['Fbp'], ['E26'], ['E31'], ['E6', true]),
        br(['E1'], ['E2', true], ['E7', true], ['E11', true])
      ],
      prodReset,
      [['E1']]
    ),
    nw(
      7,
      'NW 07 - [PRODUCCION - EST.1] Etapa 2 (E2 - Inicio Estacion 1 Carga | Evalua CP1)',
      [br(['E1'], ['I_b1'], ['ET_EF', true]), br(['E1'], ['I_b1'], ['Fbp']), br(['E2'], ['E3', true], ['E5', true])],
      prodReset,
      [['E2']]
    ),
    nw(
      8,
      'NW 08 - [PRODUCCION - EST.1] Etapa 3 (E3 - Con Botella CP1: A+ y B- Simultaneo)',
      [br(['E2'], ['CP1_EF'], ['ET_EF', true], ['E1', true]), br(['E2'], ['CP1_EF'], ['Fbp'], ['E1', true]), br(['E3'], ['E4', true])],
      prodReset,
      [['E3']]
    ),
    nw(
      9,
      'NW 09 - [PRODUCCION - EST.1] Etapa 4 (E4 - Retorno Empujador A-)',
      [br(['E3'], ['I_a1'], ['I_b0'], ['ET_EF', true]), br(['E3'], ['I_a1'], ['I_b0'], ['Fbp']), br(['E4'], ['E6', true])],
      prodReset,
      [['E4']]
    ),
    nw(
      10,
      'NW 10 - [PRODUCCION - EST.1] Etapa 5 (E5 - Sin Botella /CP1: Solo Retorno B-)',
      [br(['E2'], ['CP1_EF', true], ['ET_EF', true], ['E1', true]), br(['E2'], ['CP1_EF', true], ['Fbp'], ['E1', true]), br(['E5'], ['E6', true])],
      prodReset,
      [['E5']]
    ),
    nw(
      11,
      'NW 11 - [PRODUCCION - EST.1] Etapa 6 (E6 - Espera Sincronizacion Estacion 1)',
      [
        br(['E4'], ['I_a0'], ['ET_EF', true]),
        br(['E4'], ['I_a0'], ['Fbp']),
        br(['E5'], ['I_b0'], ['ET_EF', true]),
        br(['E5'], ['I_b0'], ['Fbp']),
        br(['E6'], ['E0', true])
      ],
      prodReset,
      [['E6']]
    ),
    nw(
      12,
      'NW 12 - [PRODUCCION - EST.2] Etapa 7 (E7 - Inicio Estacion 2 Llenado | Evalua CP2)',
      [br(['E1'], ['I_b1'], ['ET_EF', true]), br(['E1'], ['I_b1'], ['Fbp']), br(['E7'], ['E8', true], ['E10', true])],
      prodReset,
      [['E7']]
    ),
    nw(
      13,
      'NW 13 - [PRODUCCION - EST.2] Etapa 8 (E8 - Dosificacion y Descarga: C+ y D+)',
      [br(['E7'], ['CP2_EF'], ['ET_EF', true], ['E1', true]), br(['E7'], ['CP2_EF'], ['Fbp'], ['E1', true]), br(['E8'], ['E9', true])],
      prodReset,
      [['E8']]
    ),
    nw(
      14,
      'NW 14 - [PRODUCCION - EST.2] Etapa 9 (E9 - Recarga Dosificador C-)',
      [br(['E8'], ['I_c1'], ['ET_EF', true]), br(['E8'], ['I_c1'], ['Fbp']), br(['E9'], ['E10', true])],
      prodReset,
      [['E9']]
    ),
    nw(
      15,
      'NW 15 - [PRODUCCION - EST.2] Etapa 10 (E10 - Espera Sincronizacion Estacion 2)',
      [
        br(['E9'], ['I_c0'], ['ET_EF', true]),
        br(['E9'], ['I_c0'], ['Fbp']),
        br(['E7'], ['CP2_EF', true], ['E1', true], ['ET_EF', true]),
        br(['E7'], ['CP2_EF', true], ['E1', true], ['Fbp']),
        br(['E10'], ['E0', true])
      ],
      prodReset,
      [['E10']]
    ),
    nw(
      16,
      'NW 16 - [PRODUCCION - EST.3] Etapa 11 (E11 - Inicio Estacion 3 Taponado | Evalua CP3)',
      [br(['E1'], ['I_b1'], ['ET_EF', true]), br(['E1'], ['I_b1'], ['Fbp']), br(['E11'], ['E12', true], ['E18', true])],
      prodReset,
      [['E11']]
    ),
    nw(
      17,
      'NW 17 - [PRODUCCION - EST.3] Etapa 12 (E12 - Presenta Tapon G+)',
      [br(['E11'], ['CP3_EF'], ['ET_EF', true], ['E1', true]), br(['E11'], ['CP3_EF'], ['Fbp'], ['E1', true]), br(['E12'], ['E13', true])],
      prodReset,
      [['E12']]
    ),
    nw(
      18,
      'NW 18 - [PRODUCCION - EST.3] Etapa 13 (E13 - Coloca Tapon E+)',
      [br(['E12'], ['g1_EF'], ['ET_EF', true]), br(['E12'], ['g1_EF'], ['Fbp']), br(['E13'], ['E14', true])],
      prodReset,
      [['E13']]
    ),
    nw(
      19,
      'NW 19 - [PRODUCCION - EST.3] Etapa 14 (E14 - Sube Cabezal E-)',
      [br(['E13'], ['e1_EF'], ['ET_EF', true]), br(['E13'], ['e1_EF'], ['Fbp']), br(['E14'], ['E15', true])],
      prodReset,
      [['E14']]
    ),
    nw(
      20,
      'NW 20 - [PRODUCCION - EST.3] Etapa 15 (E15 - Retira Presentador G-)',
      [br(['E14'], ['e0_EF'], ['ET_EF', true]), br(['E14'], ['e0_EF'], ['Fbp']), br(['E15'], ['E16', true])],
      prodReset,
      [['E15']]
    ),
    nw(
      21,
      'NW 21 - [PRODUCCION - EST.3] Etapa 16 (E16 - Baja y Rosca E+ y F+)',
      [br(['E15'], ['g0_EF'], ['ET_EF', true]), br(['E15'], ['g0_EF'], ['Fbp']), br(['E16'], ['E17', true])],
      prodReset,
      [['E16']]
    ),
    nw(
      22,
      'NW 22 - [PRODUCCION - EST.3] Etapa 17 (E17 - Sube Cabezal Final E-)',
      [br(['E16'], ['e1_EF'], ['ET_EF', true]), br(['E16'], ['e1_EF'], ['Fbp']), br(['E17'], ['E18', true])],
      prodReset,
      [['E17']]
    ),
    nw(
      23,
      'NW 23 - [PRODUCCION - EST.3] Etapa 18 (E18 - Espera Sincronizacion Estacion 3)',
      [
        br(['E17'], ['e0_EF'], ['ET_EF', true]),
        br(['E17'], ['e0_EF'], ['Fbp']),
        br(['E11'], ['CP3_EF', true], ['E1', true], ['ET_EF', true]),
        br(['E11'], ['CP3_EF', true], ['E1', true], ['Fbp']),
        br(['E18'], ['E0', true])
      ],
      prodReset,
      [['E18']]
    ),

    // NW 24..31: GRAFCET Conducción / Rearme A6 / Manual F4
    nw(
      24,
      'NW 24 - [CONDUCCION] Etapa 20 (E20 - Inicial Conduccion GEMMA)',
      [br(['IG']), br(['E32']), br(['RecFa_A']), br(['E26'], ['Man_EF']), br(['E27'], ['Man_EF', true]), br(['E20'], ['E21', true], ['E27', true])],
      [],
      [['E20']]
    ),
    nw(
      25,
      'NW 25 - [CONDUCCION - A6] Etapa 21 (E21 - Retorno Automatico A-)',
      [br(['E20'], ['March_EF'], ['Man_EF', true], ['E31']), br(['E20'], ['M_Homing'], ['Man_EF', true], ['E31']), br(['E21'], ['E22', true])],
      condReset,
      [['E21']]
    ),
    nw(26, 'NW 26 - [CONDUCCION - A6] Etapa 22 (E22 - Retorno Automatico B-)', [br(['E21'], ['I_a0']), br(['E22'], ['E23', true])], condReset, [['E22']]),
    nw(27, 'NW 27 - [CONDUCCION - A6] Etapa 23 (E23 - Retorno Automatico C-)', [br(['E22'], ['I_b0']), br(['E23'], ['E24', true])], condReset, [['E23']]),
    nw(28, 'NW 28 - [CONDUCCION - A6] Etapa 24 (E24 - Retorno Automatico E-)', [br(['E23'], ['I_c0']), br(['E24'], ['E25', true])], condReset, [['E24']]),
    nw(29, 'NW 29 - [CONDUCCION - A6] Etapa 25 (E25 - Retorno Automatico G-)', [br(['E24'], ['e0_EF']), br(['E25'], ['E26', true])], condReset, [['E25']]),
    nw(30, 'NW 30 - [CONDUCCION - A6] Etapa 26 (E26 - Condiciones Iniciales OK)', [br(['E25'], ['g0_EF']), br(['E26'], ['E20', true])], condReset, [['E26']]),
    nw(31, 'NW 31 - [CONDUCCION - F4] Etapa 27 (E27 - Modo Manual F4 + Forzado F-G00)', [br(['E20'], ['March_EF'], ['Man_EF'], ['E31']), br(['E27'], ['E20', true])], condReset, [['E27']]),

    // NW 32..34: GRAFCET Seguridad D1 / D2
    nw(
      32,
      'NW 32 - [SEGURIDAD] Etapa 30 (E30 - Inicial Seguridad D1/D2)',
      [br(['IG']), br(['E31'], ['PE_A']), br(['E31'], ['FG']), br(['E32'], ['PE_A', true], ['FG', true]), br(['E30'], ['E31', true], ['E32', true])],
      [],
      [['E30']]
    ),
    nw(
      33,
      'NW 33 - [SEGURIDAD] Etapa 31 (E31 - Sistema Normal OK)',
      [br(['E30'], ['March_EF'], ['PE_A', true], ['FG', true]), br(['E30'], ['M_Homing'], ['PE_A', true], ['FG', true]), br(['E31'], ['E30', true])],
      [['IG', true]],
      [['E31']]
    ),
    nw(
      34,
      'NW 34 - [SEGURIDAD] Etapa 32 (E32 - Emergencia D1 / Falla D2 + Forzado F-G00 y F-2020)',
      [br(['E30'], ['PE_A']), br(['E30'], ['FG']), br(['E32'], ['E30', true])],
      [['IG', true]],
      [['E32']]
    ),

    // NW 35..46: Salidas Actuadores + Supervisión TON 4.0 s
    nw(35, 'NW 35 - [SALIDA + TON 4s] Cilindro A+ (%Q0.0) y Falla TA_MAS', [br(['E3']), br(['E27'], ['PA_MAS'])], [['E31'], ['Q_A_MEN', true], ['I_a1', true]], [['Q_A_MAS'], ['TA_MAS']], 'TnA_Mas'),
    nw(36, 'NW 36 - [SALIDA + TON 4s] Cilindro A- (%Q0.1) y Falla TA_MEN', [br(['E4']), br(['E21']), br(['E27'], ['PA_MEN'])], [['E31'], ['Q_A_MAS', true], ['I_a0', true]], [['Q_A_MEN'], ['TA_MEN']], 'TnA_Men'),
    nw(37, 'NW 37 - [SALIDA + TON 4s] Cilindro B+ (%Q0.2) y Falla TB_MAS', [br(['E1']), br(['E27'], ['PB_MAS'])], [['E31'], ['Q_B_MEN', true], ['I_b1', true]], [['Q_B_MAS'], ['TB_MAS']], 'TnB_Mas'),
    nw(38, 'NW 38 - [SALIDA + TON 4s] Cilindro B- (%Q0.3) y Falla TB_MEN', [br(['E3']), br(['E5']), br(['E22']), br(['E27'], ['PB_MEN'])], [['E31'], ['Q_B_MAS', true], ['I_b0', true]], [['Q_B_MEN'], ['TB_MEN']], 'TnB_Men'),
    nw(39, 'NW 39 - [SALIDA + TON 4s] Cilindro C+ (%Q0.4) y Falla TC_MAS', [br(['E8']), br(['E27'], ['PC_MAS'])], [['E31'], ['Q_C_MEN', true], ['I_c1', true]], [['Q_C_MAS'], ['TC_MAS']], 'TnC_Mas'),
    nw(40, 'NW 40 - [SALIDA + TON 4s] Cilindro C- (%Q0.5) y Falla TC_MEN', [br(['E9']), br(['E23']), br(['E27'], ['PC_MEN'])], [['E31'], ['Q_C_MAS', true], ['I_c0', true]], [['Q_C_MEN'], ['TC_MEN']], 'TnC_Men'),
    nw(41, 'NW 41 - [SALIDA MONOESTABLE] Valvula Descarga D+ (%Q0.6 | V7)', [br(['E8']), br(['E27'], ['PD_MAS'])], [['E31']], [['Q_D_MAS']]),
    nw(42, 'NW 42 - [SALIDA + TON 4s] Cilindro E+ (%Q0.7) y Falla TE_MAS', [br(['E13']), br(['E16']), br(['E27'], ['PE_MAS'])], [['E31'], ['Q_E_MEN', true], ['e1_EF', true]], [['Q_E_MAS'], ['TE_MAS']], 'TnE_Mas'),
    nw(43, 'NW 43 - [SALIDA + TON 4s] Cilindro E- (%Q1.0) y Falla TE_MEN', [br(['E14']), br(['E17']), br(['E24']), br(['E27'], ['PE_MEN'])], [['E31'], ['Q_E_MAS', true], ['e0_EF', true]], [['Q_E_MEN'], ['TE_MEN']], 'TnE_Men'),
    nw(44, 'NW 44 - [SALIDA MONOESTABLE] Motor Neumatico Roscado F+ (%Q1.1 | V8)', [br(['E16']), br(['E27'], ['PF_MAS'])], [['E31']], [['Q_F_MAS']]),
    nw(45, 'NW 45 - [SALIDA + TON 4s] Cilindro G+ (%Q8.0) y Falla TG_MAS', [br(['E12']), br(['E27'], ['PG_MAS'])], [['E31'], ['Q_G_MEN', true], ['g1_EF', true]], [['Q_G_MAS'], ['TG_MAS']], 'TnG_Mas'),
    nw(46, 'NW 46 - [SALIDA + TON 4s] Cilindro G- (%Q8.1) y Falla TG_MEN', [br(['E15']), br(['E25']), br(['E27'], ['PG_MEN'])], [['E31'], ['Q_G_MAS', true], ['g0_EF', true]], [['Q_G_MEN'], ['TG_MEN']], 'TnG_Men'),

    // NW 47..50: Torreta Luminosa GEMMA & Diagnóstico D2
    nw(47, 'NW 47 - [TORRETA] Luz Verde H_RUN (%Q8.2)', [br(['E31'], ['E27', true])], [], [['Q_H_RUN']]),
    nw(48, 'NW 48 - [TORRETA] Luz Amarilla H_MAN (%Q8.3)', [br(['E27']), br(['FG'])], [], [['Q_H_MAN']]),
    nw(49, 'NW 49 - [TORRETA] Luz Roja H_PE (%Q8.4)', [br(['PE_A']), br(['E32'])], [], [['Q_H_PE']]),
    nw(
      50,
      'NW 50 - [DIAGNOSTICO D2] Red Unica de Falla General Enclavada (FG)',
      [
        br(['TA_MAS']),
        br(['TA_MEN']),
        br(['TB_MAS']),
        br(['TB_MEN']),
        br(['TC_MAS']),
        br(['TC_MEN']),
        br(['TE_MAS']),
        br(['TE_MEN']),
        br(['TG_MAS']),
        br(['TG_MEN']),
        br(['FG'])
      ],
      [['RecFa_A', true], ['IG', true]],
      [['FG']]
    )
  ];
}

const BOTTLING_50_RUNGS = buildBottling50Networks();

export const BOTTLING_GEMMA_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'OB1_Embotelladora_GEMMA',
  activeLanguage: 'LAD',
  tags: BOTTLING_GEMMA_TAGS,
  rungs: BOTTLING_50_RUNGS,
  sclCode: [
    '// Nivel 8: Proyecto Final — Planta Embotelladora Industrial GEMMA (50 Networks OB1)',
    '// 5 Cilindros Doble Efecto (A, B, C, E, G) + Valvula D+ (V7) + Roscador F+ (V8)',
    '// Autor: Simón Barrera Ruíz',
    '',
    transpileLadderToScl(BOTTLING_50_RUNGS, BOTTLING_GEMMA_TAGS).replace(/"([A-Za-z0-9_]+)"\.Q/g, '$1.Q')
  ].join('\n'),
  grafcetSteps: [
    // Producción (E0..E18)
    { id: 0, name: 'E0 Reposo A1', isInitial: true, actionTag: '', actionLabel: 'GEMMA A1: Reposo inicial — Todos los cilindros en origen (a0,b0,c0,e0,g0)' },
    { id: 1, name: 'E1 B+ Avance', isInitial: false, actionTag: '%Q0.2', actionLabel: 'B+ (V2): Avance paso a paso de banda transportadora' },
    { id: 2, name: 'E2 Dec. CP1', isInitial: false, actionTag: '', actionLabel: 'Estación 1: Evaluar sensor óptico botella CP1' },
    { id: 3, name: 'E3 A+ / B-', isInitial: false, actionTag: '%Q0.0', actionLabel: 'Estación 1 con botella: Carga A+ (%Q0.0) y retorno banda B- (%Q0.3)' },
    { id: 4, name: 'E4 A- Ret.', isInitial: false, actionTag: '%Q0.1', actionLabel: 'Estación 1: Retorno empujador de carga A- (%Q0.1)' },
    { id: 5, name: 'E5 B- / Est.2', isInitial: false, actionTag: '%Q0.3', actionLabel: 'Sin botella en CP1: Solo retorno banda B- (%Q0.3) y espera Est.2' },
    { id: 6, name: 'E6 Dec. CP2', isInitial: false, actionTag: '', actionLabel: 'Sincronización Est.1 / Evaluación sensor CP2 en Estación 2' },
    { id: 7, name: 'E7 Eval CP2', isInitial: false, actionTag: '', actionLabel: 'Estación 2 Llenado: Evaluar presencia de botella CP2' },
    { id: 8, name: 'E8 C+ / D+', isInitial: false, actionTag: '%Q0.4', actionLabel: 'Estación 2: Dosificación C+ (%Q0.4) y válvula descarga D+ (%Q0.6 / V7)' },
    { id: 9, name: 'E9 C- Ret.', isInitial: false, actionTag: '%Q0.5', actionLabel: 'Estación 2: Recarga pistón dosificador C- (%Q0.5)' },
    { id: 10, name: 'E10 Esp. Est3', isInitial: false, actionTag: '', actionLabel: 'Sincronización Estación 2 y espera Estación 3' },
    { id: 11, name: 'E11 Dec. CP3', isInitial: false, actionTag: '', actionLabel: 'Estación 3 Taponado: Evaluar presencia de botella CP3' },
    { id: 12, name: 'E12 G+ Tapón', isInitial: false, actionTag: '%Q8.0', actionLabel: 'Estación 3: Cilindro presentador de tapón G+ (%Q8.0)' },
    { id: 13, name: 'E13 E+ Baja', isInitial: false, actionTag: '%Q0.7', actionLabel: 'Estación 3: Baja cabezal taponador E+ (%Q0.7)' },
    { id: 14, name: 'E14 E- Sube', isInitial: false, actionTag: '%Q1.0', actionLabel: 'Estación 3: Sube cabezal taponador E- (%Q1.0)' },
    { id: 15, name: 'E15 G- Ret.', isInitial: false, actionTag: '%Q8.1', actionLabel: 'Estación 3: Retira presentador de tapón G- (%Q8.1)' },
    { id: 16, name: 'E16 E+ / F+', isInitial: false, actionTag: '%Q1.1', actionLabel: 'Estación 3: Baja cabezal E+ (%Q0.7) y motor neumático roscado F+ (%Q1.1 / V8)' },
    { id: 17, name: 'E17 E- Final', isInitial: false, actionTag: '%Q1.0', actionLabel: 'Estación 3: Sube cabezal taponador final E- (%Q1.0)' },
    { id: 18, name: 'E18 Fin Ciclo', isInitial: false, actionTag: '%Q8.2', actionLabel: 'Sincronización final Estación 3 — Ciclo completado' },

    // Conducción / Rearme A6 / Manual F4 (E20..E27)
    { id: 20, name: 'E20 Conducc.', isInitial: true, actionTag: '', actionLabel: 'GRAFCET Conducción GEMMA: Selección Auto (A6->F1) / Manual (F4)' },
    { id: 21, name: 'E21 A6: A-', isInitial: false, actionTag: '%Q0.1', actionLabel: 'GEMMA A6: Retorno automático cilindro A-' },
    { id: 22, name: 'E22 A6: B-', isInitial: false, actionTag: '%Q0.3', actionLabel: 'GEMMA A6: Retorno automático cilindro B-' },
    { id: 23, name: 'E23 A6: C-', isInitial: false, actionTag: '%Q0.5', actionLabel: 'GEMMA A6: Retorno automático cilindro C-' },
    { id: 24, name: 'E24 A6: E-', isInitial: false, actionTag: '%Q1.0', actionLabel: 'GEMMA A6: Retorno automático cilindro E-' },
    { id: 25, name: 'E25 A6: G-', isInitial: false, actionTag: '%Q8.1', actionLabel: 'GEMMA A6: Retorno automático cilindro G-' },
    { id: 26, name: 'E26 F1 Listo', isInitial: false, actionTag: '%Q8.2', actionLabel: 'Condiciones Iniciales OK — Habilita Producción Normal F1' },
    { id: 27, name: 'E27 F4 Manual', isInitial: false, actionTag: '%Q8.3', actionLabel: 'GEMMA F4: Modo Manual (Torreta Amarilla -H_MAN)' },

    // Seguridad D1 / D2 (E30..E32)
    { id: 30, name: 'E30 Seg. Init', isInitial: true, actionTag: '', actionLabel: 'GRAFCET Seguridad: Supervisión de Emergencia D1 y Fallas TON D2' },
    { id: 31, name: 'E31 Seg. OK', isInitial: false, actionTag: '%Q8.2', actionLabel: 'Sistema Normal sin fallas — Habilita Conducción y Producción' },
    { id: 32, name: 'E32 D1/D2 PE', isInitial: false, actionTag: '%Q8.4', actionLabel: 'GEMMA D1/D2: Paro de Emergencia / Falla Global (Torreta Roja -H_PE)' }
  ],
  grafcetTransitions: [
    // Producción
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND %M3.6 AND %M4.1', label: 'Marcha (%I0.0) · E26 · E31' },
    { id: 2, fromStep: 1, toStep: 2, condition: '%I0.4', label: 'Fin carrera banda (b1)' },
    { id: 3, fromStep: 2, toStep: 3, condition: '%I1.3', label: 'Botella presente CP1' },
    { id: 4, fromStep: 3, toStep: 4, condition: '%I0.2 AND %I0.3', label: 'a1 y b0 activos' },
    { id: 5, fromStep: 4, toStep: 6, condition: '%I0.1', label: 'Retorno empujador (a0)' },
    { id: 6, fromStep: 2, toStep: 5, condition: 'NOT %I1.3', label: 'Sin botella (/CP1)' },
    { id: 7, fromStep: 5, toStep: 6, condition: '%I0.3', label: 'Retorno banda (b0)' },
    { id: 8, fromStep: 6, toStep: 7, condition: '%I0.4', label: 'Inicio Estación 2 (b1)' },
    { id: 9, fromStep: 7, toStep: 8, condition: '%I1.4', label: 'Botella presente CP2' },
    { id: 10, fromStep: 8, toStep: 9, condition: '%I0.6', label: 'Dosificador extendido (c1)' },
    { id: 11, fromStep: 9, toStep: 10, condition: '%I0.5', label: 'Dosificador recargado (c0)' },
    { id: 12, fromStep: 7, toStep: 10, condition: 'NOT %I1.4', label: 'Sin botella (/CP2)' },
    { id: 13, fromStep: 10, toStep: 11, condition: '%I0.4', label: 'Inicio Estación 3 (b1)' },
    { id: 14, fromStep: 11, toStep: 12, condition: '%I1.5', label: 'Botella presente CP3' },
    { id: 15, fromStep: 12, toStep: 13, condition: '%I1.2', label: 'Presentador tapón (g1)' },
    { id: 16, fromStep: 13, toStep: 14, condition: '%I1.0', label: 'Cabezal abajo (e1)' },
    { id: 17, fromStep: 14, toStep: 15, condition: '%I0.7', label: 'Cabezal arriba (e0)' },
    { id: 18, fromStep: 15, toStep: 16, condition: '%I1.1', label: 'Presentador retirado (g0)' },
    { id: 19, fromStep: 16, toStep: 17, condition: '%I1.0', label: 'Roscado completo (e1)' },
    { id: 20, fromStep: 17, toStep: 18, condition: '%I0.7', label: 'Cabezal arriba final (e0)' },
    { id: 21, fromStep: 11, toStep: 18, condition: 'NOT %I1.5', label: 'Sin botella (/CP3)' },
    { id: 22, fromStep: 18, toStep: 0, condition: '%I0.1 AND %I0.3 AND %I0.5 AND %I0.7 AND %I1.1', label: 'Condiciones iniciales OK -> E0' },

    // Conducción A6 / F4
    { id: 23, fromStep: 20, toStep: 21, condition: '%I0.0 AND NOT %I8.0 AND %M4.1', label: 'Marcha Auto -> Rearme A6' },
    { id: 24, fromStep: 21, toStep: 22, condition: '%I0.1', label: 'a0 OK' },
    { id: 25, fromStep: 22, toStep: 23, condition: '%I0.3', label: 'b0 OK' },
    { id: 26, fromStep: 23, toStep: 24, condition: '%I0.5', label: 'c0 OK' },
    { id: 27, fromStep: 24, toStep: 25, condition: '%I0.7', label: 'e0 OK' },
    { id: 28, fromStep: 25, toStep: 26, condition: '%I1.1', label: 'g0 OK -> F1 Listo' },
    { id: 29, fromStep: 20, toStep: 27, condition: '%I0.0 AND %I8.0 AND %M4.1', label: 'Selector Manual (-Man)' },
    { id: 30, fromStep: 27, toStep: 20, condition: 'NOT %I8.0', label: 'Salir de Manual F4' },
    { id: 31, fromStep: 26, toStep: 20, condition: '%I8.0', label: 'Cambio a Manual -> E20' },

    // Seguridad D1 / D2
    { id: 32, fromStep: 30, toStep: 31, condition: '%I8.3 AND NOT %M50.6', label: 'Seguridad OK (PE NC = 1, sin FG)' },
    { id: 33, fromStep: 31, toStep: 32, condition: 'NOT %I8.3 OR %M50.6', label: 'Emergencia D1 (-PE) o Falla TON D2' },
    { id: 34, fromStep: 32, toStep: 30, condition: '%I8.3 AND NOT %M50.6 AND NOT %I8.4', label: 'Rearme Seguridad (-RecFa)' }
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
      'Proyecto integrador GEMMA de cinta clasificadora (8 Networks): motor -KM1, sensor óptico -B1, cilindro desviador -A (Y1/Y2), TON_Desvio y paro seguro.',
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
      'Planta embotelladora 100% electroneumática bajo guía GEMMA (50 Networks OB1): 5 cilindros doble efecto (A, B, C, E, G), válvulas D+/F+, sensores CP1..CP3 y torreta 3 colores.',
    plantMode: 'bottling',
    circuit: BOTTLING_GEMMA_CIRCUIT,
    tiaProgram: BOTTLING_GEMMA_TIA_PROGRAM
  }
];

export function getExamplePreset(id: string): ExamplePreset {
  const normalized = id === 'conveyor' ? 'conveyor_project' : id;
  return EXAMPLE_PRESETS.find(preset => preset.id === normalized) ?? EXAMPLE_PRESETS[0];
}
