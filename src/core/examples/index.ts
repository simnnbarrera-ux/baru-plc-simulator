import { CircuitDocument } from '../../types/circuit';

// ============================================================================
// 1. ARRANQUE DIRECTO DE MOTOR TRIFÁSICO (BASE INTERACTIVA)
// ============================================================================
export const DIRECT_STARTER_CIRCUIT: CircuitDocument = {
  version: '1.0.0',
  gridSize: 20,
  titleBlock: {
    title: 'Arranque Directo de Motor Trifásico',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-10-16',
    sheet: '1/1',
    scale: '1:1',
    revision: '1.0',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA ----------------
    {
      id: 'pow_1',
      type: 'power_3phase_pe',
      tag: '3L+PE',
      x: 6,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_1',
      type: 'breaker_3p',
      tag: '-Q1',
      x: 6,
      y: 6,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'cnt_1',
      type: 'contactor_power_3p',
      tag: '-KM1',
      x: 6,
      y: 12,
      rotation: 0
    },
    {
      id: 'thm_1',
      type: 'thermal_relay_power',
      tag: '-F1',
      x: 6,
      y: 18,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'mot_1',
      type: 'motor_3phase',
      tag: '-M1',
      x: 6,
      y: 24,
      rotation: 0
    },

    // ---------------- CONTROL / MANIOBRA ----------------
    {
      id: 'pow_ctrl_l',
      type: 'power_l',
      tag: 'L1',
      x: 16,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_ctrl',
      type: 'breaker_1p_n',
      tag: '-Q2',
      x: 16,
      y: 5,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'thm_nc',
      type: 'thermal_contact_nc',
      tag: '-F1',
      x: 16,
      y: 11,
      rotation: 0
    },
    {
      id: 'btn_stop',
      type: 'button_nc',
      tag: '-S0',
      x: 16,
      y: 16,
      rotation: 0,
      state: { isActuated: false }
    },
    {
      id: 'btn_start',
      type: 'button_no',
      tag: '-S1',
      x: 16,
      y: 21,
      rotation: 0,
      state: { isActuated: false }
    },
    {
      id: 'aux_latch',
      type: 'contact_no',
      tag: '-KM1',
      x: 21,
      y: 21,
      rotation: 0
    },
    {
      id: 'coil_km1',
      type: 'coil_contactor',
      tag: '-KM1',
      x: 16,
      y: 26,
      rotation: 0
    },
    {
      id: 'pilot_run',
      type: 'pilot_light_green',
      tag: '-H1',
      x: 21,
      y: 26,
      rotation: 0
    },
    {
      id: 'pow_ctrl_n',
      type: 'power_n',
      tag: 'N',
      x: 16,
      y: 31,
      rotation: 0
    }
  ],
  wires: [
    // Potencia: Fuente a Guardamotor
    { id: 'w_p1', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase1' },
    { id: 'w_p2', fromX: 8, fromY: 4, toX: 8, toY: 6, wireType: 'phase2' },
    { id: 'w_p3', fromX: 9, fromY: 4, toX: 9, toY: 6, wireType: 'phase3' },

    // Guardamotor a Contactor
    { id: 'w_p4', fromX: 7, fromY: 10, toX: 7, toY: 12, wireType: 'phase1' },
    { id: 'w_p5', fromX: 8, fromY: 10, toX: 8, toY: 12, wireType: 'phase2' },
    { id: 'w_p6', fromX: 9, fromY: 10, toX: 9, toY: 12, wireType: 'phase3' },

    // Contactor a Térmico
    { id: 'w_p7', fromX: 7, fromY: 16, toX: 7, toY: 18, wireType: 'phase1' },
    { id: 'w_p8', fromX: 8, fromY: 16, toX: 8, toY: 18, wireType: 'phase2' },
    { id: 'w_p9', fromX: 9, fromY: 16, toX: 9, toY: 18, wireType: 'phase3' },

    // Térmico a Motor
    { id: 'w_p10', fromX: 7, fromY: 22, toX: 7, toY: 24, wireType: 'phase1' },
    { id: 'w_p11', fromX: 8, fromY: 22, toX: 8, toY: 24, wireType: 'phase2' },
    { id: 'w_p12', fromX: 9, fromY: 22, toX: 9, toY: 24, wireType: 'phase3' },

    // Maniobra: Fuente a Disyuntor
    { id: 'w_c1', fromX: 17, fromY: 4, toX: 17, toY: 5, wireType: 'control' },

    // Disyuntor a Térmico NC
    { id: 'w_c2', fromX: 17, fromY: 9, toX: 17, toY: 11, wireType: 'control' },

    // Térmico NC a Botón Parada
    { id: 'w_c3', fromX: 17, fromY: 14, toX: 17, toY: 16, wireType: 'control' },

    // Botón Parada a Botón Marcha
    { id: 'w_c4', fromX: 17, fromY: 19, toX: 17, toY: 21, wireType: 'control' },

    // Derivación a contacto de autoenclavamiento superior
    { id: 'w_c5', fromX: 17, fromY: 20, toX: 22, toY: 20, wireType: 'control' },
    { id: 'w_c6', fromX: 22, fromY: 20, toX: 22, toY: 21, wireType: 'control' },

    // Salida de marcha y enclavamiento a Bobina KM1
    { id: 'w_c7', fromX: 17, fromY: 24, toX: 17, toY: 26, wireType: 'control' },
    { id: 'w_c8', fromX: 22, fromY: 24, toX: 22, toY: 25, wireType: 'control' },
    { id: 'w_c9', fromX: 22, fromY: 25, toX: 17, toY: 25, wireType: 'control' },

    // Derivación a Piloto Verde
    { id: 'w_c10', fromX: 17, fromY: 25, toX: 22, toY: 25, wireType: 'control' },
    { id: 'w_c11', fromX: 22, fromY: 25, toX: 22, toY: 26, wireType: 'control' },

    // Salida de Bobina y Piloto a Neutro
    { id: 'w_c12', fromX: 17, fromY: 29, toX: 17, toY: 31, wireType: 'neutral' },
    { id: 'w_c13', fromX: 22, fromY: 29, toX: 22, toY: 30, wireType: 'neutral' },
    { id: 'w_c14', fromX: 22, fromY: 30, toX: 17, toY: 30, wireType: 'neutral' }
  ],
  junctions: [
    { id: 'j_1', x: 17, y: 20 },
    { id: 'j_2', x: 17, y: 25 },
    { id: 'j_3', x: 17, y: 30 }
  ]
};

// ============================================================================
// 2. ARRANQUE ESTRELLA - TRIÁNGULO (Y-Δ) AUTOMÁTICO CON TON 5S (IEC 60947)
// ============================================================================
export const STAR_DELTA_CIRCUIT: CircuitDocument = {
  version: '2.0.0',
  gridSize: 20,
  titleBlock: {
    title: 'Arranque Estrella - Triángulo Temporizado (Y-Δ)',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-10-16',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.0',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA (FUERZA) ----------------
    {
      id: 'pow_1',
      type: 'power_3phase_pe',
      tag: '3L+PE',
      x: 4,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_1',
      type: 'breaker_3p',
      tag: '-Q1',
      x: 4,
      y: 6,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'cnt_km1',
      type: 'contactor_power_3p',
      tag: '-KM1',
      x: 4,
      y: 12,
      rotation: 0
    },
    {
      id: 'thm_1',
      type: 'thermal_relay_power',
      tag: '-F1',
      x: 4,
      y: 18,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'mot_1',
      type: 'motor_3phase_6p',
      tag: '-M1',
      x: 4,
      y: 24,
      rotation: 0
    },
    {
      id: 'cnt_km2',
      type: 'contactor_power_3p',
      tag: '-KM2',
      x: 11,
      y: 18,
      rotation: 0
    },
    {
      id: 'cnt_km3',
      type: 'contactor_power_3p',
      tag: '-KM3',
      x: 17,
      y: 18,
      rotation: 0
    },

    // ---------------- CONTROL / MANIOBRA ----------------
    {
      id: 'pow_ctrl_l',
      type: 'power_l',
      tag: 'L1',
      x: 26,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_ctrl',
      type: 'breaker_1p_n',
      tag: '-Q2',
      x: 26,
      y: 5,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'thm_nc',
      type: 'thermal_contact_nc',
      tag: '-F1',
      x: 26,
      y: 10,
      rotation: 0
    },
    {
      id: 'btn_stop',
      type: 'button_nc',
      tag: '-S0',
      x: 26,
      y: 14,
      rotation: 0,
      state: { isActuated: false }
    },
    {
      id: 'btn_start',
      type: 'button_no',
      tag: '-S1',
      x: 26,
      y: 19,
      rotation: 0,
      state: { isActuated: false }
    },
    {
      id: 'aux_km1_latch',
      type: 'contact_no',
      tag: '-KM1',
      x: 30,
      y: 19,
      rotation: 0
    },
    {
      id: 'coil_km1',
      type: 'coil_contactor',
      tag: '-KM1',
      x: 26,
      y: 26,
      rotation: 0
    },
    {
      id: 'coil_kt1',
      type: 'coil_timer_ton',
      tag: '-KT1',
      timerValue: 5,
      x: 30,
      y: 26,
      rotation: 0
    },
    {
      id: 'aux_kt1_nc',
      type: 'contact_timer_ton_nc',
      tag: '-KT1',
      x: 34,
      y: 24,
      rotation: 0
    },
    {
      id: 'aux_km2_nc',
      type: 'contact_nc',
      tag: '-KM2',
      x: 34,
      y: 28,
      rotation: 0
    },
    {
      id: 'coil_km3',
      type: 'coil_contactor',
      tag: '-KM3',
      x: 34,
      y: 32,
      rotation: 0
    },
    {
      id: 'aux_kt1_no',
      type: 'contact_timer_ton_no',
      tag: '-KT1',
      x: 38,
      y: 24,
      rotation: 0
    },
    {
      id: 'aux_km3_nc',
      type: 'contact_nc',
      tag: '-KM3',
      x: 38,
      y: 28,
      rotation: 0
    },
    {
      id: 'coil_km2',
      type: 'coil_contactor',
      tag: '-KM2',
      x: 38,
      y: 32,
      rotation: 0
    },
    {
      id: 'pilot_run',
      type: 'pilot_light_green',
      tag: '-H1',
      x: 42,
      y: 26,
      rotation: 0
    },
    {
      id: 'pilot_delta',
      type: 'pilot_light_yellow',
      tag: '-H2',
      x: 42,
      y: 32,
      rotation: 0
    },
    {
      id: 'pow_ctrl_n',
      type: 'power_n',
      tag: 'N',
      x: 26,
      y: 37,
      rotation: 0
    }
  ],
  wires: [
    // ---------------- POTENCIA ----------------
    // Fuente a Guardamotor
    { id: 'w_sd_p1', fromX: 5, fromY: 4, toX: 5, toY: 6, wireType: 'phase1' },
    { id: 'w_sd_p2', fromX: 6, fromY: 4, toX: 6, toY: 6, wireType: 'phase2' },
    { id: 'w_sd_p3', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase3' },

    // Guardamotor a Contactor de Línea KM1
    { id: 'w_sd_p4', fromX: 5, fromY: 10, toX: 5, toY: 11, wireType: 'phase1' },
    { id: 'w_sd_p5', fromX: 5, fromY: 11, toX: 5, toY: 12, wireType: 'phase1' },
    { id: 'w_sd_p6', fromX: 6, fromY: 10, toX: 6, toY: 11, wireType: 'phase2' },
    { id: 'w_sd_p7', fromX: 6, fromY: 11, toX: 6, toY: 12, wireType: 'phase2' },
    { id: 'w_sd_p8', fromX: 7, fromY: 10, toX: 7, toY: 11, wireType: 'phase3' },
    { id: 'w_sd_p9', fromX: 7, fromY: 11, toX: 7, toY: 12, wireType: 'phase3' },

    // Derivación de Línea hacia Contactor Triángulo KM2
    { id: 'w_sd_p10', fromX: 5, fromY: 11, toX: 12, toY: 11, wireType: 'phase1' },
    { id: 'w_sd_p11', fromX: 12, fromY: 11, toX: 12, toY: 18, wireType: 'phase1' },
    { id: 'w_sd_p12', fromX: 6, fromY: 11, toX: 13, toY: 11, wireType: 'phase2' },
    { id: 'w_sd_p13', fromX: 13, fromY: 11, toX: 13, toY: 18, wireType: 'phase2' },
    { id: 'w_sd_p14', fromX: 7, fromY: 11, toX: 14, toY: 11, wireType: 'phase3' },
    { id: 'w_sd_p15', fromX: 14, fromY: 11, toX: 14, toY: 18, wireType: 'phase3' },

    // Contactor KM1 a Relé Térmico F1
    { id: 'w_sd_p16', fromX: 5, fromY: 16, toX: 5, toY: 18, wireType: 'phase1' },
    { id: 'w_sd_p17', fromX: 6, fromY: 16, toX: 6, toY: 18, wireType: 'phase2' },
    { id: 'w_sd_p18', fromX: 7, fromY: 16, toX: 7, toY: 18, wireType: 'phase3' },

    // Térmico F1 a Bornes Principales Motor U1, V1, W1
    { id: 'w_sd_p19', fromX: 5, fromY: 22, toX: 5, toY: 24, wireType: 'phase1' },
    { id: 'w_sd_p20', fromX: 6, fromY: 22, toX: 6, toY: 24, wireType: 'phase2' },
    { id: 'w_sd_p21', fromX: 7, fromY: 22, toX: 7, toY: 24, wireType: 'phase3' },
    { id: 'w_sd_pe', fromX: 8, fromY: 4, toX: 8, toY: 26, wireType: 'pe' },

    // Bornes Secundarios W2, U2, V2 hacia KM2 (Triángulo) y KM3 (Estrella)
    // Borne W2 (5,29)
    { id: 'w_sd_p22', fromX: 5, fromY: 29, toX: 5, toY: 31, wireType: 'phase1' },
    { id: 'w_sd_p23', fromX: 5, fromY: 31, toX: 12, toY: 31, wireType: 'phase1' },
    { id: 'w_sd_p24', fromX: 12, fromY: 31, toX: 12, toY: 22, wireType: 'phase1' },
    { id: 'w_sd_p25', fromX: 12, fromY: 31, toX: 18, toY: 31, wireType: 'phase1' },
    { id: 'w_sd_p26', fromX: 18, fromY: 31, toX: 18, toY: 22, wireType: 'phase1' },

    // Borne U2 (6,29)
    { id: 'w_sd_p27', fromX: 6, fromY: 29, toX: 6, toY: 32, wireType: 'phase2' },
    { id: 'w_sd_p28', fromX: 6, fromY: 32, toX: 13, toY: 32, wireType: 'phase2' },
    { id: 'w_sd_p29', fromX: 13, fromY: 32, toX: 13, toY: 22, wireType: 'phase2' },
    { id: 'w_sd_p30', fromX: 13, fromY: 32, toX: 19, toY: 32, wireType: 'phase2' },
    { id: 'w_sd_p31', fromX: 19, fromY: 32, toX: 19, toY: 22, wireType: 'phase2' },

    // Borne V2 (7,29)
    { id: 'w_sd_p32', fromX: 7, fromY: 29, toX: 7, toY: 33, wireType: 'phase3' },
    { id: 'w_sd_p33', fromX: 7, fromY: 33, toX: 14, toY: 33, wireType: 'phase3' },
    { id: 'w_sd_p34', fromX: 14, fromY: 33, toX: 14, toY: 22, wireType: 'phase3' },
    { id: 'w_sd_p35', fromX: 14, fromY: 33, toX: 20, toY: 33, wireType: 'phase3' },
    { id: 'w_sd_p36', fromX: 20, fromY: 33, toX: 20, toY: 22, wireType: 'phase3' },

    // Puente de Estrella en la parte superior de KM3 (18,16)-(20,16)
    { id: 'w_sd_p37', fromX: 18, fromY: 18, toX: 18, toY: 16, wireType: 'phase1' },
    { id: 'w_sd_p38', fromX: 19, fromY: 18, toX: 19, toY: 16, wireType: 'phase2' },
    { id: 'w_sd_p39', fromX: 20, fromY: 18, toX: 20, toY: 16, wireType: 'phase3' },
    { id: 'w_sd_p40', fromX: 18, fromY: 16, toX: 19, toY: 16, wireType: 'phase1' },
    { id: 'w_sd_p41', fromX: 19, fromY: 16, toX: 20, toY: 16, wireType: 'phase1' },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'w_sd_c1', fromX: 27, fromY: 4, toX: 27, toY: 5, wireType: 'control' },
    { id: 'w_sd_c2', fromX: 27, fromY: 9, toX: 27, toY: 10, wireType: 'control' },
    { id: 'w_sd_c3', fromX: 27, fromY: 13, toX: 27, toY: 14, wireType: 'control' },
    { id: 'w_sd_c4', fromX: 27, fromY: 17, toX: 27, toY: 18, wireType: 'control' },

    // Paralelo Marcha S1 y Retención KM1 (13-14)
    { id: 'w_sd_c5', fromX: 27, fromY: 18, toX: 31, toY: 18, wireType: 'control' },
    { id: 'w_sd_c6', fromX: 31, fromY: 18, toX: 31, toY: 19, wireType: 'control' },
    { id: 'w_sd_c7', fromX: 27, fromY: 18, toX: 27, toY: 19, wireType: 'control' },
    { id: 'w_sd_c8', fromX: 27, fromY: 22, toX: 27, toY: 23, wireType: 'control' },
    { id: 'w_sd_c9', fromX: 31, fromY: 22, toX: 31, toY: 23, wireType: 'control' },
    { id: 'w_sd_c10', fromX: 31, fromY: 23, toX: 27, toY: 23, wireType: 'control' },

    // Bus Activo de Marcha a y=23
    { id: 'w_sd_c11', fromX: 27, fromY: 23, toX: 31, toY: 23, wireType: 'control' },
    { id: 'w_sd_c12', fromX: 31, fromY: 23, toX: 35, toY: 23, wireType: 'control' },
    { id: 'w_sd_c13', fromX: 35, fromY: 23, toX: 39, toY: 23, wireType: 'control' },
    { id: 'w_sd_c14', fromX: 39, fromY: 23, toX: 43, toY: 23, wireType: 'control' },

    // Rama 1: Bobina KM1 (Línea)
    { id: 'w_sd_c15', fromX: 27, fromY: 23, toX: 27, toY: 26, wireType: 'control' },

    // Rama 2: Bobina KT1 (Temporizador TON)
    { id: 'w_sd_c16', fromX: 31, fromY: 23, toX: 31, toY: 26, wireType: 'control' },

    // Rama 3: Contacto KT1 NC (55-56) -> KM2 NC (21-22) -> Bobina KM3 (Estrella)
    { id: 'w_sd_c17', fromX: 35, fromY: 23, toX: 35, toY: 24, wireType: 'control' },
    { id: 'w_sd_c18', fromX: 35, fromY: 27, toX: 35, toY: 28, wireType: 'control' },
    { id: 'w_sd_c19', fromX: 35, fromY: 31, toX: 35, toY: 32, wireType: 'control' },

    // Rama 4: Contacto KT1 NA (67-68) -> KM3 NC (21-22) -> Bobina KM2 (Triángulo)
    { id: 'w_sd_c20', fromX: 39, fromY: 23, toX: 39, toY: 24, wireType: 'control' },
    { id: 'w_sd_c21', fromX: 39, fromY: 27, toX: 39, toY: 28, wireType: 'control' },
    { id: 'w_sd_c22', fromX: 39, fromY: 31, toX: 39, toY: 32, wireType: 'control' },

    // Rama 5: Piloto Verde H1 (Marcha)
    { id: 'w_sd_c23', fromX: 43, fromY: 23, toX: 43, toY: 26, wireType: 'control' },

    // Rama 6: Piloto Ámbar H2 (Triángulo Régimen) conectado a borne A1 de KM2
    { id: 'w_sd_c24', fromX: 39, fromY: 32, toX: 43, toY: 32, wireType: 'control' },

    // Retorno de Neutro (N) al bus común y=36
    { id: 'w_sd_n0', fromX: 28, fromY: 9, toX: 28, toY: 36, wireType: 'neutral' },
    { id: 'w_sd_n1', fromX: 27, fromY: 29, toX: 27, toY: 36, wireType: 'neutral' },
    { id: 'w_sd_n2', fromX: 31, fromY: 29, toX: 31, toY: 36, wireType: 'neutral' },
    { id: 'w_sd_n3', fromX: 35, fromY: 35, toX: 35, toY: 36, wireType: 'neutral' },
    { id: 'w_sd_n4', fromX: 39, fromY: 35, toX: 39, toY: 36, wireType: 'neutral' },
    { id: 'w_sd_n5', fromX: 43, fromY: 29, toX: 43, toY: 36, wireType: 'neutral' },
    { id: 'w_sd_n6', fromX: 43, fromY: 35, toX: 43, toY: 36, wireType: 'neutral' },
    { id: 'w_sd_n7', fromX: 27, fromY: 39, toX: 27, toY: 36, wireType: 'neutral' },
    { id: 'w_sd_n8', fromX: 27, fromY: 36, toX: 43, toY: 36, wireType: 'neutral' }
  ],
  junctions: [
    // Potencia
    { id: 'j_sd_p1', x: 5, y: 11 },
    { id: 'j_sd_p2', x: 6, y: 11 },
    { id: 'j_sd_p3', x: 7, y: 11 },
    { id: 'j_sd_p4', x: 12, y: 31 },
    { id: 'j_sd_p5', x: 13, y: 32 },
    { id: 'j_sd_p6', x: 14, y: 33 },
    { id: 'j_sd_p7', x: 18, y: 16 },
    { id: 'j_sd_p8', x: 19, y: 16 },
    // Control
    { id: 'j_sd_c1', x: 27, y: 18 },
    { id: 'j_sd_c2', x: 27, y: 23 },
    { id: 'j_sd_c3', x: 31, y: 23 },
    { id: 'j_sd_c4', x: 35, y: 23 },
    { id: 'j_sd_c5', x: 39, y: 23 },
    { id: 'j_sd_c6', x: 39, y: 32 },
    // Neutro
    { id: 'j_sd_n1', x: 27, y: 36 },
    { id: 'j_sd_n2', x: 28, y: 36 },
    { id: 'j_sd_n3', x: 31, y: 36 },
    { id: 'j_sd_n4', x: 35, y: 36 },
    { id: 'j_sd_n5', x: 39, y: 36 },
    { id: 'j_sd_n6', x: 43, y: 36 }
  ]
};

// ============================================================================
// 3. INVERSOR DE GIRO DE MOTOR TRIFÁSICO CON DOBLE ENCLAVAMIENTO (IEC 60947)
// ============================================================================
export const REVERSE_STARTER_CIRCUIT: CircuitDocument = {
  version: '2.0.0',
  gridSize: 20,
  titleBlock: {
    title: 'Inversión de Giro de Motor Trifásico',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-10-16',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.0',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA (FUERZA) ----------------
    {
      id: 'pow_1',
      type: 'power_3phase_pe',
      tag: '3L+PE',
      x: 4,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_1',
      type: 'breaker_3p',
      tag: '-Q1',
      x: 4,
      y: 6,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'cnt_km1',
      type: 'contactor_power_3p',
      tag: '-KM1',
      x: 4,
      y: 12,
      rotation: 0
    },
    {
      id: 'cnt_km2',
      type: 'contactor_power_3p',
      tag: '-KM2',
      x: 10,
      y: 12,
      rotation: 0
    },
    {
      id: 'thm_1',
      type: 'thermal_relay_power',
      tag: '-F1',
      x: 4,
      y: 20,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'mot_1',
      type: 'motor_3phase',
      tag: '-M1',
      x: 4,
      y: 26,
      rotation: 0
    },

    // ---------------- CONTROL / MANIOBRA ----------------
    {
      id: 'pow_ctrl_l',
      type: 'power_l',
      tag: 'L1',
      x: 20,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_ctrl',
      type: 'breaker_1p_n',
      tag: '-Q2',
      x: 20,
      y: 5,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'thm_nc',
      type: 'thermal_contact_nc',
      tag: '-F1',
      x: 20,
      y: 10,
      rotation: 0
    },
    {
      id: 'btn_stop',
      type: 'button_nc',
      tag: '-S0',
      x: 20,
      y: 14,
      rotation: 0,
      state: { isActuated: false }
    },
    // Rama 1: Sentido Horario (CW)
    {
      id: 'btn_start_cw',
      type: 'button_no',
      tag: '-S1',
      x: 20,
      y: 19,
      rotation: 0,
      state: { isActuated: false }
    },
    {
      id: 'aux_km1_latch',
      type: 'contact_no',
      tag: '-KM1',
      x: 24,
      y: 19,
      rotation: 0
    },
    {
      id: 'aux_km2_nc',
      type: 'contact_nc',
      tag: '-KM2',
      x: 20,
      y: 24,
      rotation: 0
    },
    {
      id: 'coil_km1',
      type: 'coil_contactor',
      tag: '-KM1',
      x: 20,
      y: 28,
      rotation: 0
    },
    {
      id: 'pilot_cw',
      type: 'pilot_light_green',
      tag: '-H1',
      x: 24,
      y: 28,
      rotation: 0
    },
    // Rama 2: Sentido Antihorario (CCW)
    {
      id: 'btn_start_ccw',
      type: 'button_no',
      tag: '-S2',
      x: 29,
      y: 19,
      rotation: 0,
      state: { isActuated: false }
    },
    {
      id: 'aux_km2_latch',
      type: 'contact_no',
      tag: '-KM2',
      x: 33,
      y: 19,
      rotation: 0
    },
    {
      id: 'aux_km1_nc',
      type: 'contact_nc',
      tag: '-KM1',
      x: 29,
      y: 24,
      rotation: 0
    },
    {
      id: 'coil_km2',
      type: 'coil_contactor',
      tag: '-KM2',
      x: 29,
      y: 28,
      rotation: 0
    },
    {
      id: 'pilot_ccw',
      type: 'pilot_light_yellow',
      tag: '-H2',
      x: 33,
      y: 28,
      rotation: 0
    },
    // Rama 3: Señalización de Parada / En Espera
    {
      id: 'aux_km1_stop_nc',
      type: 'contact_nc',
      tag: '-KM1',
      x: 38,
      y: 19,
      rotation: 0
    },
    {
      id: 'aux_km2_stop_nc',
      type: 'contact_nc',
      tag: '-KM2',
      x: 38,
      y: 23,
      rotation: 0
    },
    {
      id: 'pilot_stop',
      type: 'pilot_light_red',
      tag: '-H0',
      x: 38,
      y: 28,
      rotation: 0
    },
    {
      id: 'pow_ctrl_n',
      type: 'power_n',
      tag: 'N',
      x: 20,
      y: 34,
      rotation: 0
    }
  ],
  wires: [
    // ---------------- POTENCIA ----------------
    // Fuente a Guardamotor
    { id: 'w_rev_p1', fromX: 5, fromY: 4, toX: 5, toY: 6, wireType: 'phase1' },
    { id: 'w_rev_p2', fromX: 6, fromY: 4, toX: 6, toY: 6, wireType: 'phase2' },
    { id: 'w_rev_p3', fromX: 7, fromY: 4, toX: 7, toY: 6, wireType: 'phase3' },

    // Guardamotor a Contactor KM1
    { id: 'w_rev_p4', fromX: 5, fromY: 10, toX: 5, toY: 11, wireType: 'phase1' },
    { id: 'w_rev_p5', fromX: 5, fromY: 11, toX: 5, toY: 12, wireType: 'phase1' },
    { id: 'w_rev_p6', fromX: 6, fromY: 10, toX: 6, toY: 11, wireType: 'phase2' },
    { id: 'w_rev_p7', fromX: 6, fromY: 11, toX: 6, toY: 12, wireType: 'phase2' },
    { id: 'w_rev_p8', fromX: 7, fromY: 10, toX: 7, toY: 11, wireType: 'phase3' },
    { id: 'w_rev_p9', fromX: 7, fromY: 11, toX: 7, toY: 12, wireType: 'phase3' },

    // Derivación superior a Contactor KM2 (Misma secuencia de entrada)
    { id: 'w_rev_p10', fromX: 5, fromY: 11, toX: 11, toY: 11, wireType: 'phase1' },
    { id: 'w_rev_p11', fromX: 11, fromY: 11, toX: 11, toY: 12, wireType: 'phase1' },
    { id: 'w_rev_p12', fromX: 6, fromY: 11, toX: 12, toY: 11, wireType: 'phase2' },
    { id: 'w_rev_p13', fromX: 12, fromY: 11, toX: 12, toY: 12, wireType: 'phase2' },
    { id: 'w_rev_p14', fromX: 7, fromY: 11, toX: 13, toY: 11, wireType: 'phase3' },
    { id: 'w_rev_p15', fromX: 13, fromY: 11, toX: 13, toY: 12, wireType: 'phase3' },

    // Salida KM1 a Térmico F1 (Secuencia directa L1-L2-L3)
    { id: 'w_rev_p16', fromX: 5, fromY: 16, toX: 5, toY: 17, wireType: 'phase1' },
    { id: 'w_rev_p17', fromX: 5, fromY: 17, toX: 5, toY: 20, wireType: 'phase1' },
    { id: 'w_rev_p18', fromX: 6, fromY: 16, toX: 6, toY: 18, wireType: 'phase2' },
    { id: 'w_rev_p19', fromX: 6, fromY: 18, toX: 6, toY: 20, wireType: 'phase2' },
    { id: 'w_rev_p20', fromX: 7, fromY: 16, toX: 7, toY: 19, wireType: 'phase3' },
    { id: 'w_rev_p21', fromX: 7, fromY: 19, toX: 7, toY: 20, wireType: 'phase3' },

    // Cruce de fases de KM2 para inversión (L1->L3, L2->L2, L3->L1)
    // Pin 6 de KM2 (L3) a Fase 1 (x=5) a nivel y=17
    { id: 'w_rev_p22', fromX: 13, fromY: 16, toX: 13, toY: 17, wireType: 'phase3' },
    { id: 'w_rev_p23', fromX: 13, fromY: 17, toX: 5, toY: 17, wireType: 'phase3' },

    // Pin 4 de KM2 (L2) a Fase 2 (x=6) a nivel y=18
    { id: 'w_rev_p24', fromX: 12, fromY: 16, toX: 12, toY: 18, wireType: 'phase2' },
    { id: 'w_rev_p25', fromX: 12, fromY: 18, toX: 6, toY: 18, wireType: 'phase2' },

    // Pin 2 de KM2 (L1) a Fase 3 (x=7) a nivel y=19
    { id: 'w_rev_p26', fromX: 11, fromY: 16, toX: 11, toY: 19, wireType: 'phase1' },
    { id: 'w_rev_p27', fromX: 11, fromY: 19, toX: 7, toY: 19, wireType: 'phase1' },

    // Térmico a Motor
    { id: 'w_rev_p28', fromX: 5, fromY: 24, toX: 5, toY: 26, wireType: 'phase1' },
    { id: 'w_rev_p29', fromX: 6, fromY: 24, toX: 6, toY: 26, wireType: 'phase2' },
    { id: 'w_rev_p30', fromX: 7, fromY: 24, toX: 7, toY: 26, wireType: 'phase3' },
    { id: 'w_rev_pe', fromX: 8, fromY: 4, toX: 8, toY: 28, wireType: 'pe' },

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'w_rev_c1', fromX: 21, fromY: 4, toX: 21, toY: 5, wireType: 'control' },
    { id: 'w_rev_c2', fromX: 21, fromY: 9, toX: 21, toY: 10, wireType: 'control' },
    { id: 'w_rev_c3', fromX: 21, fromY: 13, toX: 21, toY: 14, wireType: 'control' },
    { id: 'w_rev_c4', fromX: 21, fromY: 17, toX: 21, toY: 18, wireType: 'control' },

    // Bus Superior tras Paro -S0 a y=18
    { id: 'w_rev_c5', fromX: 21, fromY: 18, toX: 30, toY: 18, wireType: 'control' },
    { id: 'w_rev_c6', fromX: 30, fromY: 18, toX: 39, toY: 18, wireType: 'control' },

    // Rama 1: Pulsador Horario S1 y Latch KM1
    { id: 'w_rev_c7', fromX: 21, fromY: 18, toX: 21, toY: 19, wireType: 'control' },
    { id: 'w_rev_c8', fromX: 21, fromY: 18, toX: 25, toY: 18, wireType: 'control' },
    { id: 'w_rev_c9', fromX: 25, fromY: 18, toX: 25, toY: 19, wireType: 'control' },
    { id: 'w_rev_c10', fromX: 21, fromY: 22, toX: 21, toY: 23, wireType: 'control' },
    { id: 'w_rev_c11', fromX: 25, fromY: 22, toX: 25, toY: 23, wireType: 'control' },
    { id: 'w_rev_c12', fromX: 25, fromY: 23, toX: 21, toY: 23, wireType: 'control' },
    // Enclavamiento NC de KM2 hacia Bobina KM1
    { id: 'w_rev_c13', fromX: 21, fromY: 23, toX: 21, toY: 24, wireType: 'control' },
    { id: 'w_rev_c14', fromX: 21, fromY: 27, toX: 21, toY: 28, wireType: 'control' },
    // Derivación a Piloto Verde CW
    { id: 'w_rev_c15', fromX: 21, fromY: 28, toX: 25, toY: 28, wireType: 'control' },

    // Rama 2: Pulsador Antihorario S2 y Latch KM2
    { id: 'w_rev_c16', fromX: 30, fromY: 18, toX: 30, toY: 19, wireType: 'control' },
    { id: 'w_rev_c17', fromX: 30, fromY: 18, toX: 34, toY: 18, wireType: 'control' },
    { id: 'w_rev_c18', fromX: 34, fromY: 18, toX: 34, toY: 19, wireType: 'control' },
    { id: 'w_rev_c19', fromX: 30, fromY: 22, toX: 30, toY: 23, wireType: 'control' },
    { id: 'w_rev_c20', fromX: 34, fromY: 22, toX: 34, toY: 23, wireType: 'control' },
    { id: 'w_rev_c21', fromX: 34, fromY: 23, toX: 30, toY: 23, wireType: 'control' },
    // Enclavamiento NC de KM1 hacia Bobina KM2
    { id: 'w_rev_c22', fromX: 30, fromY: 23, toX: 30, toY: 24, wireType: 'control' },
    { id: 'w_rev_c23', fromX: 30, fromY: 27, toX: 30, toY: 28, wireType: 'control' },
    // Derivación a Piloto Amarillo CCW
    { id: 'w_rev_c24', fromX: 30, fromY: 28, toX: 34, toY: 28, wireType: 'control' },

    // Rama 3: Contactos NC en serie para Piloto Rojo (Motor Parado)
    { id: 'w_rev_c25', fromX: 39, fromY: 18, toX: 39, toY: 19, wireType: 'control' },
    { id: 'w_rev_c26', fromX: 39, fromY: 22, toX: 39, toY: 23, wireType: 'control' },
    { id: 'w_rev_c27', fromX: 39, fromY: 26, toX: 39, toY: 28, wireType: 'control' },

    // Retorno a Neutro (N) a nivel y=33
    { id: 'w_rev_n0', fromX: 22, fromY: 9, toX: 22, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n1', fromX: 21, fromY: 31, toX: 21, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n2', fromX: 25, fromY: 31, toX: 25, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n3', fromX: 30, fromY: 31, toX: 30, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n4', fromX: 34, fromY: 31, toX: 34, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n5', fromX: 39, fromY: 31, toX: 39, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n6', fromX: 21, fromY: 36, toX: 21, toY: 33, wireType: 'neutral' },
    { id: 'w_rev_n7', fromX: 21, fromY: 33, toX: 39, toY: 33, wireType: 'neutral' }
  ],
  junctions: [
    // Potencia
    { id: 'j_rev_p1', x: 5, y: 11 },
    { id: 'j_rev_p2', x: 6, y: 11 },
    { id: 'j_rev_p3', x: 7, y: 11 },
    { id: 'j_rev_p4', x: 5, y: 17 },
    { id: 'j_rev_p5', x: 6, y: 18 },
    { id: 'j_rev_p6', x: 7, y: 19 },
    // Control
    { id: 'j_rev_c1', x: 21, y: 18 },
    { id: 'j_rev_c2', x: 21, y: 23 },
    { id: 'j_rev_c3', x: 21, y: 28 },
    { id: 'j_rev_c4', x: 30, y: 18 },
    { id: 'j_rev_c5', x: 30, y: 23 },
    { id: 'j_rev_c6', x: 30, y: 28 },
    // Neutro
    { id: 'j_rev_n1', x: 21, y: 33 },
    { id: 'j_rev_n2', x: 22, y: 33 },
    { id: 'j_rev_n3', x: 25, y: 33 },
    { id: 'j_rev_n4', x: 30, y: 33 },
    { id: 'j_rev_n5', x: 34, y: 33 },
    { id: 'j_rev_n6', x: 39, y: 33 }
  ]
};

// ============================================================================
// 4. AUTOMATISMO DE CINTA TRANSPORTADORA CON BALIZA Y SENSOR (IEC 60204-1)
// ============================================================================
export const CONVEYOR_BELT_CIRCUIT: CircuitDocument = {
  version: '2.0.0',
  gridSize: 20,
  titleBlock: {
    title: 'Automatismo de Cinta Transportadora Industrial',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-10-16',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.0',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA (FUERZA) ----------------
    {
      id: 'pow_1',
      type: 'power_3phase_pe',
      tag: '3L+PE',
      x: 6,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_1',
      type: 'breaker_3p',
      tag: '-Q1',
      x: 6,
      y: 6,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'cnt_1',
      type: 'contactor_power_3p',
      tag: '-KM1',
      x: 6,
      y: 12,
      rotation: 0
    },
    {
      id: 'thm_1',
      type: 'thermal_relay_power',
      tag: '-F1',
      x: 6,
      y: 18,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'mot_1',
      type: 'motor_3phase',
      tag: '-M1',
      x: 6,
      y: 24,
      rotation: 0
    },

    // ---------------- CONTROL / MANIOBRA ----------------
    {
      id: 'pow_ctrl_l',
      type: 'power_l',
      tag: 'L1',
      x: 18,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_ctrl',
      type: 'breaker_1p_n',
      tag: '-Q2',
      x: 18,
      y: 5,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'thm_nc',
      type: 'thermal_contact_nc',
      tag: '-F1',
      x: 18,
      y: 10,
      rotation: 0
    },
    {
      id: 'btn_es',
      type: 'emergency_stop',
      tag: '-S0',
      x: 18,
      y: 14,
      rotation: 0,
      state: { isActuated: false }
    },
    {
      id: 'sensor_b1',
      type: 'limit_switch_nc',
      tag: '-B1',
      x: 18,
      y: 18,
      rotation: 0,
      state: { isActuated: false }
    },
    // Marcha / Rearme y Enclavamiento
    {
      id: 'btn_start',
      type: 'button_no',
      tag: '-S1',
      x: 18,
      y: 23,
      rotation: 0,
      state: { isActuated: false }
    },
    {
      id: 'aux_latch',
      type: 'contact_no',
      tag: '-KM1',
      x: 23,
      y: 23,
      rotation: 0
    },
    {
      id: 'coil_km1',
      type: 'coil_contactor',
      tag: '-KM1',
      x: 18,
      y: 28,
      rotation: 0
    },
    // Baliza Verde (Marcha)
    {
      id: 'pilot_green',
      type: 'pilot_light_green',
      tag: '-H1',
      x: 23,
      y: 28,
      rotation: 0
    },
    // Baliza Roja (Parada / En Espera) gobernada por NC de KM1
    {
      id: 'aux_km1_nc',
      type: 'contact_nc',
      tag: '-KM1',
      x: 28,
      y: 23,
      rotation: 0
    },
    {
      id: 'pilot_red',
      type: 'pilot_light_red',
      tag: '-H2',
      x: 28,
      y: 28,
      rotation: 0
    },
    // Baliza Ámbar (Alarma Sobrecarga Térmico F1)
    {
      id: 'thm_no',
      type: 'thermal_contact_no',
      tag: '-F1',
      x: 33,
      y: 23,
      rotation: 0
    },
    {
      id: 'pilot_yellow',
      type: 'pilot_light_yellow',
      tag: '-H3',
      x: 33,
      y: 28,
      rotation: 0
    },
    {
      id: 'pow_ctrl_n',
      type: 'power_n',
      tag: 'N',
      x: 18,
      y: 34,
      rotation: 0
    }
  ],
  wires: [
    // ---------------- POTENCIA ----------------
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

    // ---------------- CONTROL / MANIOBRA ----------------
    { id: 'w_conv_c1', fromX: 19, fromY: 4, toX: 19, toY: 5, wireType: 'control' },
    { id: 'w_conv_c2', fromX: 19, fromY: 9, toX: 19, toY: 10, wireType: 'control' },
    // Derivación a contacto NA de alarma térmica
    { id: 'w_conv_c3', fromX: 19, fromY: 10, toX: 34, toY: 10, wireType: 'control' },
    { id: 'w_conv_c4', fromX: 34, fromY: 10, toX: 34, toY: 23, wireType: 'control' },

    // Serie de seguridad: Térmico NC -> Parada Emergencia Seta -> Sensor B1
    { id: 'w_conv_c5', fromX: 19, fromY: 10, toX: 19, toY: 13, wireType: 'control' },
    { id: 'w_conv_c6', fromX: 19, fromY: 13, toX: 19, toY: 14, wireType: 'control' },
    { id: 'w_conv_c7', fromX: 19, fromY: 17, toX: 19, toY: 18, wireType: 'control' },
    { id: 'w_conv_c8', fromX: 19, fromY: 21, toX: 19, toY: 22, wireType: 'control' },

    // Bus tras sensor B1 a y=22
    { id: 'w_conv_c9', fromX: 19, fromY: 22, toX: 19, toY: 23, wireType: 'control' },
    { id: 'w_conv_c10', fromX: 19, fromY: 22, toX: 24, toY: 22, wireType: 'control' },
    { id: 'w_conv_c11', fromX: 24, fromY: 22, toX: 24, toY: 23, wireType: 'control' },
    { id: 'w_conv_c12', fromX: 24, fromY: 22, toX: 29, toY: 22, wireType: 'control' },
    { id: 'w_conv_c13', fromX: 29, fromY: 22, toX: 29, toY: 23, wireType: 'control' },

    // Retención de KM1
    { id: 'w_conv_c14', fromX: 19, fromY: 26, toX: 19, toY: 27, wireType: 'control' },
    { id: 'w_conv_c15', fromX: 24, fromY: 26, toX: 24, toY: 27, wireType: 'control' },
    { id: 'w_conv_c16', fromX: 24, fromY: 27, toX: 19, toY: 27, wireType: 'control' },
    { id: 'w_conv_c17', fromX: 19, fromY: 27, toX: 19, toY: 28, wireType: 'control' },

    // Piloto Verde Baliza en paralelo con bobina KM1
    { id: 'w_conv_c18', fromX: 19, fromY: 28, toX: 24, toY: 28, wireType: 'control' },

    // Piloto Rojo Baliza gobernado por NC de KM1
    { id: 'w_conv_c19', fromX: 29, fromY: 26, toX: 29, toY: 28, wireType: 'control' },

    // Piloto Ámbar Baliza gobernado por NA de F1
    { id: 'w_conv_c20', fromX: 34, fromY: 26, toX: 34, toY: 28, wireType: 'control' },

    // Retorno a Neutro (N) a nivel y=33
    { id: 'w_conv_n0', fromX: 20, fromY: 9, toX: 20, toY: 33, wireType: 'neutral' },
    { id: 'w_conv_n1', fromX: 19, fromY: 31, toX: 19, toY: 33, wireType: 'neutral' },
    { id: 'w_conv_n2', fromX: 24, fromY: 31, toX: 24, toY: 33, wireType: 'neutral' },
    { id: 'w_conv_n3', fromX: 29, fromY: 31, toX: 29, toY: 33, wireType: 'neutral' },
    { id: 'w_conv_n4', fromX: 34, fromY: 31, toX: 34, toY: 33, wireType: 'neutral' },
    { id: 'w_conv_n5', fromX: 19, fromY: 36, toX: 19, toY: 33, wireType: 'neutral' },
    { id: 'w_conv_n6', fromX: 19, fromY: 33, toX: 34, toY: 33, wireType: 'neutral' }
  ],
  junctions: [
    { id: 'j_conv_1', x: 19, y: 10 },
    { id: 'j_conv_2', x: 19, y: 22 },
    { id: 'j_conv_3', x: 24, y: 22 },
    { id: 'j_conv_4', x: 19, y: 27 },
    { id: 'j_conv_5', x: 19, y: 28 },
    { id: 'j_conv_n1', x: 19, y: 33 },
    { id: 'j_conv_n2', x: 20, y: 33 },
    { id: 'j_conv_n3', x: 24, y: 33 },
    { id: 'j_conv_n4', x: 29, y: 33 },
    { id: 'j_conv_n5', x: 34, y: 33 }
  ]
};

// ============================================================================
// 5. AUTOMATISMO DE BOMBA DE AGUA CON BOYAS DE NIVEL (IEC 60947)
// ============================================================================
export const WATER_TANK_PUMP_CIRCUIT: CircuitDocument = {
  version: '2.0.0',
  gridSize: 20,
  titleBlock: {
    title: 'Automatismo de Bomba de Agua y Control de Nivel',
    project: 'Automatismos Industriales',
    author: 'Simón Barrera Ruíz',
    date: '2026-10-16',
    sheet: '1/1',
    scale: '1:1',
    revision: '2.0',
    company: 'Sistemas de Automatización'
  },
  components: [
    // ---------------- POTENCIA (FUERZA) ----------------
    {
      id: 'pow_1',
      type: 'power_3phase_pe',
      tag: '3L+PE',
      x: 6,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_1',
      type: 'breaker_3p',
      tag: '-Q1',
      x: 6,
      y: 6,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'cnt_1',
      type: 'contactor_power_3p',
      tag: '-KM1',
      x: 6,
      y: 12,
      rotation: 0
    },
    {
      id: 'thm_1',
      type: 'thermal_relay_power',
      tag: '-F1',
      x: 6,
      y: 18,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'mot_1',
      type: 'motor_3phase',
      tag: '-M1',
      x: 6,
      y: 24,
      rotation: 0
    },

    // ---------------- CONTROL / MANIOBRA ----------------
    {
      id: 'pow_ctrl_l',
      type: 'power_l',
      tag: 'L1',
      x: 18,
      y: 2,
      rotation: 0
    },
    {
      id: 'brk_ctrl',
      type: 'breaker_1p_n',
      tag: '-Q2',
      x: 18,
      y: 5,
      rotation: 0,
      state: { isOpen: false }
    },
    {
      id: 'thm_nc',
      type: 'thermal_contact_nc',
      tag: '-F1',
      x: 18,
      y: 10,
      rotation: 0
    },
    {
      id: 'btn_stop',
      type: 'button_nc',
      tag: '-S0',
      x: 18,
      y: 14,
      rotation: 0,
      state: { isActuated: false }
    },
    // Boya Nivel Máximo NC (Corta la bomba al llenar)
    {
      id: 'float_max_nc',
      type: 'limit_switch_nc',
      tag: '-B_MAX',
      x: 18,
      y: 18,
      rotation: 0,
      state: { isActuated: false }
    },
    // Boya Nivel Mínimo NA (Inicia bombeo cuando el tanque se vacía)
    {
      id: 'float_min_no',
      type: 'limit_switch_no',
      tag: '-B_MIN',
      x: 18,
      y: 23,
      rotation: 0,
      state: { isActuated: false }
    },
    // Pulsador de Marcha Manual
    {
      id: 'btn_start',
      type: 'button_no',
      tag: '-S1',
      x: 23,
      y: 23,
      rotation: 0,
      state: { isActuated: false }
    },
    // Retención / Memoria de Bombeo (-KM1 13-14)
    {
      id: 'aux_latch',
      type: 'contact_no',
      tag: '-KM1',
      x: 28,
      y: 23,
      rotation: 0
    },
    // Bobina de la Bomba (-KM1 A1-A2)
    {
      id: 'coil_km1',
      type: 'coil_contactor',
      tag: '-KM1',
      x: 18,
      y: 28,
      rotation: 0
    },
    // Piloto Verde (Bomba en Marcha)
    {
      id: 'pilot_pump',
      type: 'pilot_light_green',
      tag: '-H1',
      x: 23,
      y: 28,
      rotation: 0
    },
    // Piloto Rojo (Depósito Lleno / Standby) vía contacto NC de KM1
    {
      id: 'aux_km1_nc',
      type: 'contact_nc',
      tag: '-KM1',
      x: 33,
      y: 23,
      rotation: 0
    },
    {
      id: 'pilot_full',
      type: 'pilot_light_red',
      tag: '-H2',
      x: 33,
      y: 28,
      rotation: 0
    },
    // Piloto Ámbar (Alarma Sobrecarga / Nivel Crítico)
    {
      id: 'thm_no',
      type: 'thermal_contact_no',
      tag: '-F1',
      x: 38,
      y: 23,
      rotation: 0
    },
    {
      id: 'pilot_alarm',
      type: 'pilot_light_yellow',
      tag: '-H3',
      x: 38,
      y: 28,
      rotation: 0
    },
    {
      id: 'pow_ctrl_n',
      type: 'power_n',
      tag: 'N',
      x: 18,
      y: 34,
      rotation: 0
    }
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
    // Derivación hacia alarma térmica
    { id: 'w_pmp_c3', fromX: 19, fromY: 10, toX: 39, toY: 10, wireType: 'control' },
    { id: 'w_pmp_c4', fromX: 39, fromY: 10, toX: 39, toY: 23, wireType: 'control' },

    // Serie de seguridad: Térmico NC -> Parada Seguridad S0 -> Boya Máximo B_MAX
    { id: 'w_pmp_c5', fromX: 19, fromY: 10, toX: 19, toY: 13, wireType: 'control' },
    { id: 'w_pmp_c6', fromX: 19, fromY: 13, toX: 19, toY: 14, wireType: 'control' },
    { id: 'w_pmp_c7', fromX: 19, fromY: 17, toX: 19, toY: 18, wireType: 'control' },

    // Alimentación a piloto de Depósito Lleno / Standby aguas arriba de B_MAX
    { id: 'w_pmp_c8', fromX: 19, fromY: 18, toX: 34, toY: 18, wireType: 'control' },
    { id: 'w_pmp_c9', fromX: 34, fromY: 18, toX: 34, toY: 23, wireType: 'control' },

    // Salida de Boya Máximo hacia bus de arranque
    { id: 'w_pmp_c10', fromX: 19, fromY: 21, toX: 19, toY: 22, wireType: 'control' },
    { id: 'w_pmp_c11', fromX: 19, fromY: 22, toX: 19, toY: 23, wireType: 'control' },
    { id: 'w_pmp_c12', fromX: 19, fromY: 22, toX: 24, toY: 22, wireType: 'control' },
    { id: 'w_pmp_c13', fromX: 24, fromY: 22, toX: 24, toY: 23, wireType: 'control' },
    { id: 'w_pmp_c14', fromX: 24, fromY: 22, toX: 29, toY: 22, wireType: 'control' },
    { id: 'w_pmp_c15', fromX: 29, fromY: 22, toX: 29, toY: 23, wireType: 'control' },

    // Retorno de B_MIN, S1 y Latch hacia bobina KM1
    { id: 'w_pmp_c16', fromX: 19, fromY: 26, toX: 19, toY: 27, wireType: 'control' },
    { id: 'w_pmp_c17', fromX: 24, fromY: 26, toX: 24, toY: 27, wireType: 'control' },
    { id: 'w_pmp_c18', fromX: 24, fromY: 27, toX: 19, toY: 27, wireType: 'control' },
    { id: 'w_pmp_c19', fromX: 29, fromY: 26, toX: 29, toY: 27, wireType: 'control' },
    { id: 'w_pmp_c20', fromX: 29, fromY: 27, toX: 24, toY: 27, wireType: 'control' },
    { id: 'w_pmp_c21', fromX: 19, fromY: 27, toX: 19, toY: 28, wireType: 'control' },

    // Piloto Verde en paralelo con bobina KM1
    { id: 'w_pmp_c22', fromX: 19, fromY: 28, toX: 24, toY: 28, wireType: 'control' },

    // Piloto Rojo (Depósito Lleno) gobernado por NC de KM1
    { id: 'w_pmp_c23', fromX: 34, fromY: 26, toX: 34, toY: 28, wireType: 'control' },

    // Piloto Ámbar (Alarma) gobernado por NA de F1
    { id: 'w_pmp_c24', fromX: 39, fromY: 26, toX: 39, toY: 28, wireType: 'control' },

    // Retorno a Neutro (N) a nivel y=33
    { id: 'w_pmp_n0', fromX: 20, fromY: 9, toX: 20, toY: 33, wireType: 'neutral' },
    { id: 'w_pmp_n1', fromX: 19, fromY: 31, toX: 19, toY: 33, wireType: 'neutral' },
    { id: 'w_pmp_n2', fromX: 24, fromY: 31, toX: 24, toY: 33, wireType: 'neutral' },
    { id: 'w_pmp_n3', fromX: 34, fromY: 31, toX: 34, toY: 33, wireType: 'neutral' },
    { id: 'w_pmp_n4', fromX: 39, fromY: 31, toX: 39, toY: 33, wireType: 'neutral' },
    { id: 'w_pmp_n5', fromX: 19, fromY: 36, toX: 19, toY: 33, wireType: 'neutral' },
    { id: 'w_pmp_n6', fromX: 19, fromY: 33, toX: 39, toY: 33, wireType: 'neutral' }
  ],
  junctions: [
    { id: 'j_pmp_1', x: 19, y: 10 },
    { id: 'j_pmp_2', x: 19, y: 18 },
    { id: 'j_pmp_3', x: 19, y: 22 },
    { id: 'j_pmp_4', x: 24, y: 22 },
    { id: 'j_pmp_5', x: 19, y: 27 },
    { id: 'j_pmp_6', x: 24, y: 27 },
    { id: 'j_pmp_7', x: 19, y: 28 },
    { id: 'j_pmp_n1', x: 19, y: 33 },
    { id: 'j_pmp_n2', x: 20, y: 33 },
    { id: 'j_pmp_n3', x: 24, y: 33 },
    { id: 'j_pmp_n4', x: 34, y: 33 },
    { id: 'j_pmp_n5', x: 39, y: 33 }
  ]
};
