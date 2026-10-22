export type FaultId = 
  | 'phase_loss_l1'     // Corte de conductor L1
  | 'phase_loss_l2'     // Corte de conductor L2 (asimetría de tensiones y sobreintensidad)
  | 'phase_loss_l3'     // Corte de conductor L3
  | 'fase_cortada'      // Alias general de pérdida de fase
  | 'thermal_overload'  // Disparo por sobrecarga térmica: contacto 95-96 de -F1 abierto
  | 'short_circuit'     // Cortocircuito franco Fase-Neutro o Fase-Fase (disparo magnético de -Q1)
  | 'open_coil_km1'     // Falla de bobina abierta en contactor -KM1
  | 'bobina_abierta'    // Alias general de bobina abierta
  | 'welded_contact_km1'// Contactos principales o auxiliares soldados en contactor -KM1
  | 'contacto_soldado'; // Alias general de contacto soldado

export interface FaultDefinition {
  id: FaultId;
  name: string;
  shortName: string;
  category: 'power' | 'protection' | 'control';
  affectedTag: string;
  description: string;
  symptoms: string;
  measurementClues: string[];
  correctiveAction: string;
  examQuestionTitle: string;
}

export const FAULT_CATALOG: FaultDefinition[] = [
  {
    id: 'phase_loss_l2',
    name: 'Falla de Fase: Corte en Conductor L2',
    shortName: 'Corte Fase L2',
    category: 'power',
    affectedTag: 'L2 (Borna 3-4)',
    description: 'Interrupción física del conductor de fase L2 (corte de cable, borne suelto o fusible L2 fundido) aguas arriba o abajo del seccionador.',
    symptoms: 'Al energizar el contactor, el motor -M1 emite un fuerte zumbido electromagnético, vibra intensamente y no alcanza velocidad nominal. La pinza amperimétrica registra sobreintensidad bifásica severa (>18 A) y asimetría total de tensiones.',
    measurementClues: [
      'Tensión L1-L2 = 0 V AC (Asimetría severa)',
      'Tensión L2-L3 = 0 V AC (Ausencia de potencial en L2)',
      'Tensión L1-L3 = 400 V AC (Fases sanas)',
      'Tensión L2-N = 0 V AC',
      'Corriente de fase = ~18.5 A (2.5x corriente nominal de placa)'
    ],
    correctiveAction: 'Verificar apriete de bornas, continuidad del cable L2 con el multímetro en Ω y reponer conductor seccionado.',
    examQuestionTitle: 'Pérdida / Corte de Fase L2 (Conductor seccionado con asimetría y sobreintensidad)'
  },
  {
    id: 'phase_loss_l3',
    name: 'Falla de Fase: Corte en Conductor L3',
    shortName: 'Corte Fase L3',
    category: 'power',
    affectedTag: 'L3 (Borna 5-6)',
    description: 'Interrupción física del conductor de fase L3, dejando la alimentación trifásica en régimen bifásico asimétrico.',
    symptoms: 'Motor trifásico sin par de arranque suficiente, vibración anómala y calentamiento rápido del estator por sobrecorriente.',
    measurementClues: [
      'Tensión L1-L3 = 0 V AC',
      'Tensión L2-L3 = 0 V AC',
      'Tensión L1-L2 = 400 V AC',
      'Tensión L3-N = 0 V AC'
    ],
    correctiveAction: 'Comprobar aislamiento y continuidad de la fase L3 y reconectar borna.',
    examQuestionTitle: 'Pérdida / Corte de Fase L3 (Conductor seccionado)'
  },
  {
    id: 'thermal_overload',
    name: 'Disparo por Sobrecarga Térmica en Relé -F1',
    shortName: 'Sobrecarga Térmica -F1',
    category: 'protection',
    affectedTag: '-F1 (Contacto 95-96)',
    description: 'Apertura forzada y permanente del contacto auxiliar bimetálico normalmente cerrado (NC 95-96) del relé de protección térmica -F1 tras disparo por sobrecarga.',
    symptoms: 'El circuito de mando queda sin alimentación hacia la botonera de marcha -S1. Al pulsar -S1, el contactor -KM1 no reacciona en absoluto.',
    measurementClues: [
      'Medición de continuidad en bornas 95-96 de -F1 (sin tensión): Marca O.L (Circuito abierto)',
      'Tensión en borna 95 respecto a Neutro: 230 V AC (Llega alimentación)',
      'Tensión en borna 96 respecto a Neutro: 0 V AC (Contacto abierto, no transfiere tensión)',
      'Contacto auxiliar NA 97-98 cerrado (señalización de avería)'
    ],
    correctiveAction: 'Esperar enfriamiento de láminas bimetálicas, verificar que el rotor del motor gire libre y presionar el botón azul de RESET en -F1.',
    examQuestionTitle: 'Disparo térmico por sobrecarga en Relé Térmico -F1 (Contacto 95-96 abierto)'
  },
  {
    id: 'short_circuit',
    name: 'Cortocircuito Franco Fase-Neutro o Fase-Fase',
    shortName: 'Cortocircuito Franco',
    category: 'protection',
    affectedTag: '-Q1 (Guardamotor)',
    description: 'Unión accidental de impedancia nula entre fase viva y neutro/fase, produciendo una sobreintensidad instantánea destructiva (Icc > 150 A).',
    symptoms: 'Disparo magnético instantáneo del guardamotor magnetotérmico -Q1 con fuerte estampido de arco eléctrico y destello. Si se intenta rearmar la palanca con la avería presente, salta de inmediato.',
    measurementClues: [
      'Guardamotor -Q1 pasa a posición de disparo (OPEN) en <10 ms',
      'Resistencia entre conductores cortocircuitados: 0.0 Ω (Continuidad franca)',
      'Caída de tensión instantánea a 0V durante el disparo'
    ],
    correctiveAction: 'Inspeccionar visualmente el cuadro eléctrico, aislar los cables que hacen contacto físico indeseado y rearmar -Q1.',
    examQuestionTitle: 'Cortocircuito franco aguas abajo con disparo magnético de Guardamotor -Q1'
  },
  {
    id: 'open_coil_km1',
    name: 'Falla de Bobina Abierta en Contactor -KM1',
    shortName: 'Bobina Abierta -KM1',
    category: 'control',
    affectedTag: '-KM1 (Bornas A1-A2)',
    description: 'Devanado de cobre esmaltado del solenoide de 230V cortado o fundido internamente por choque térmico o sobretensión prolongada.',
    symptoms: 'Al presionar el pulsador de marcha -S1, el comprobador y el multímetro confirman 230 V AC presentes en las bornas A1-A2, pero el electroimán no enclava mecánicamente.',
    measurementClues: [
      'Tensión en bornas A1 - A2 con -S1 pulsado: 230 V AC (Tensión correcta presente)',
      'Medición de resistencia Ω en bornas A1-A2 (circuito sin tensión): Marca O.L (Resistencia infinita, bobina cortada en vez de ~580 Ω nominales)',
      'Los contactos de potencia 1-2, 3-4, 5-6 y el auxiliar 13-14 permanecen abiertos'
    ],
    correctiveAction: 'Desmontar el contactor -KM1, verificar resistencia de la bobina y sustituir el módulo solenoide de 230V AC.',
    examQuestionTitle: 'Bobina de Contactor -KM1 abierta/cortada internamente (A1-A2 = ∞ Ω)'
  },
  {
    id: 'welded_contact_km1',
    name: 'Contactos Principales/Auxiliares Soldados en Contactor -KM1',
    shortName: 'Contacto Soldado -KM1',
    category: 'control',
    affectedTag: '-KM1 (Polos 1-2, 3-4, 5-6 / NA 13-14)',
    description: 'Microsoldadura o fusión de las pastillas de contacto por arco voltaico sostenido o sobrecorriente grave. Los contactos principales y/o el contacto de auto-retención 13-14 quedan cerrados mecánicamente de forma permanente, impidiendo detener el motor al pulsar parada.',
    symptoms: 'Al presionar el pulsador de parada -S0, el motor no se detiene o el contactor se reactiva inmediatamente al soltarlo. Con el circuito desenergizado, el multímetro registra continuidad franca (0.0 Ω) a través de los contactos.',
    measurementClues: [
      'Resistencia entre polos 1-2, 3-4, 5-6 con circuito sin tensión: 0.0 Ω (Continuidad franca permanente)',
      'Resistencia entre contacto auxiliar 13-14: 0.0 Ω (Contacto soldado cerrado)',
      'Tensión en motor U1-V1-W1 se mantiene presente aunque la bobina A1-A2 esté sin excitación'
    ],
    correctiveAction: 'Desconectar la alimentación general, sustituir la cámara de contactos o reemplazar el contactor -KM1 completo según IEC 60947-4-1.',
    examQuestionTitle: 'Contactos principales de potencia o retención soldados en Contactor -KM1 (No responde a parada)'
  }
];

export interface ExamSession {
  isActive: boolean;
  hiddenFaultId: FaultId | null;
  startedAt: number | null;
  attempts: number;
  submittedAnswer: FaultId | null;
  isPassed: boolean | null;
  score: number | null;
  feedback: string | null;
  studentNotes: string;
}
