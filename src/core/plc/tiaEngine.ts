// ============================================================================
// TIA Portal S7-1200 IEC 61131-3 Runtime & Compiler Engine (LAD + SCL + Tags)
// Author: Simón Barrera Ruíz
// ============================================================================

export type TiaLanguage = 'LAD' | 'SCL' | 'GRAFCET';

export type GemmaMode = 'AU' | 'CL' | 'ET' | 'MAN';

export type TiaContactType = 'NO' | 'NC';
export type TiaCoilType = 'OUT' | 'SET' | 'RESET';

export interface TiaLadderContact {
  id: string;
  type: TiaContactType;
  address: string; // ej: "%I0.0", "%Q0.0", "%M0.0", "T1.Q"
}

export interface TiaLadderCoil {
  id: string;
  type: TiaCoilType;
  address: string; // ej: "%Q0.0", "%M0.0"
}

export interface TiaLadderTimer {
  id: string;
  name: string;         // ej: "T1", "TON_1"
  type: 'TON' | 'TOF';
  presetSeconds: number;
}

export interface TiaLadderCounter {
  id: string;
  name: string;         // ej: "C1", "CTU_1"
  presetCount: number;
}

export interface TiaLadderBranch {
  id: string;
  contacts: TiaLadderContact[];
}

export interface TiaLadderRung {
  id: string;
  number: number;
  comment: string;
  branches: TiaLadderBranch[];         // Ramas OR en paralelo
  seriesContacts: TiaLadderContact[];  // Contactos en serie
  coils: TiaLadderCoil[];              // Bobinas finales
  timer?: TiaLadderTimer;
  counter?: TiaLadderCounter;
}

export interface TiaTag {
  address: string;       // "%I0.0", "%Q0.0", "%M0.0"
  name: string;          // Symbolic name: "Boton_Marcha", "Motor_KM1"
  dataType: 'Bool' | 'Time' | 'Int';
  schematicTag?: string; // Vínculo opcional con tag de CADe_SIMU (ej. "-S1", "-KM1", "a0")
  comment?: string;
}

export interface TiaGrafcetStep {
  id: number;
  name: string;
  isInitial: boolean;
  actionTag: string;     // ej: "%Q0.0"
  actionLabel: string;
}

export interface TiaGrafcetTransition {
  id: number;
  fromStep: number;
  toStep: number;
  condition: string;     // ej: "%I0.0 AND NOT %I0.1"
  label: string;
}

export interface TiaProgramDocument {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC';
  blockName: string;     // "Main" (OB1)
  activeLanguage: TiaLanguage;
  tags: TiaTag[];
  rungs: TiaLadderRung[];
  sclCode: string;
  grafcetSteps: TiaGrafcetStep[];
  grafcetTransitions: TiaGrafcetTransition[];
}

export interface TiaTimerRuntime {
  inState: boolean;
  et: number; // segundos transcurridos
  pt: number; // preset en segundos
  q: boolean;
}

export interface TiaCounterRuntime {
  prevCu: boolean;
  cv: number;
  pv: number;
  q: boolean;
}

export interface TiaSclError {
  line: number;
  message: string;
}

export interface TiaRuntimeState {
  inputs: Record<string, boolean>;
  outputs: Record<string, boolean>;
  memory: Record<string, boolean>;
  forcedInputs: Record<string, boolean>;
  timers: Record<string, TiaTimerRuntime>;
  counters: Record<string, TiaCounterRuntime>;
  activeSteps: number[]; // para GRAFCET
  rungPowerFlow: Record<string, boolean>;     // Rung ID -> flujo final activo
  elementPowerFlow: Record<string, boolean>;  // Contact/Coil ID -> energizado (Gafas Online)
  sclWatch: Record<string, string>;           // Valores en vivo para SCL
  sclErrors: TiaSclError[];
  scanCount: number;
  gemmaMode: GemmaMode;
  emergencyStop: boolean;
  rearmPulse: boolean;
  cyclePulse: boolean;
  stepPulse: boolean;
  gemmaStateCode: string; // 'A1' | 'F1' | 'F4' | 'F5' | 'A2' | 'A6' | 'D1'
}

export const DEFAULT_TIA_PROGRAM: TiaProgramDocument = {
  cpuModel: 'S7-1200 CPU 1214C DC/DC/DC',
  blockName: 'Main',
  activeLanguage: 'LAD',
  tags: [
    { address: '%I0.0', name: 'Boton_Marcha', dataType: 'Bool', schematicTag: '-S1', comment: 'Pulsador NA de arranque' },
    { address: '%I0.1', name: 'Boton_Paro', dataType: 'Bool', schematicTag: '-S0', comment: 'Pulsador NC de parada' },
    { address: '%I0.2', name: 'Rele_Termico', dataType: 'Bool', schematicTag: '-F1', comment: 'Protección térmica NC' },
    { address: '%I0.3', name: 'Sensor_a0', dataType: 'Bool', schematicTag: 'a0', comment: 'Final de carrera inicio cilindro A' },
    { address: '%I0.4', name: 'Sensor_a1', dataType: 'Bool', schematicTag: 'a1', comment: 'Final de carrera fin cilindro A' },
    { address: '%Q0.0', name: 'Contactor_KM1', dataType: 'Bool', schematicTag: '-KM1', comment: 'Bobina motor principal' },
    { address: '%Q0.1', name: 'Piloto_Marcha', dataType: 'Bool', schematicTag: '-H1', comment: 'Piloto verde marcha' },
    { address: '%Q0.2', name: 'Electrovalvula_A_Mas', dataType: 'Bool', schematicTag: 'Y1', comment: 'Avance cilindro A' },
    { address: '%Q0.3', name: 'Electrovalvula_A_Menos', dataType: 'Bool', schematicTag: 'Y2', comment: 'Retorno cilindro A' },
    { address: '%M0.0', name: 'Ciclo_Activo', dataType: 'Bool', comment: 'Memoria interna de ciclo' }
  ],
  rungs: [
    {
      id: 'net_1',
      number: 1,
      comment: 'Marcha y Enclavamiento Motor Principal (-KM1)',
      branches: [
        {
          id: 'br_1_a',
          contacts: [{ id: 'c_1_1', type: 'NO', address: '%I0.0' }]
        },
        {
          id: 'br_1_b',
          contacts: [{ id: 'c_1_2', type: 'NO', address: '%Q0.0' }]
        }
      ],
      seriesContacts: [
        { id: 'c_1_3', type: 'NC', address: '%I0.1' }
      ],
      coils: [
        { id: 'coil_1_1', type: 'OUT', address: '%Q0.0' },
        { id: 'coil_1_2', type: 'OUT', address: '%Q0.1' }
      ]
    },
    {
      id: 'net_2',
      number: 2,
      comment: 'Temporizador de Supervisión TON (3.0 s)',
      branches: [
        {
          id: 'br_2_a',
          contacts: [{ id: 'c_2_1', type: 'NO', address: '%Q0.0' }]
        }
      ],
      seriesContacts: [],
      timer: {
        id: 'tm_1',
        name: 'TON_1',
        type: 'TON',
        presetSeconds: 3.0
      },
      coils: [
        { id: 'coil_2_1', type: 'OUT', address: '%M0.0' }
      ]
    }
  ],
  sclCode: `// Bloque Principal OB1 en SCL (IEC 61131-3)
// Compatible con Siemens TIA Portal V16 - V21

IF ("Boton_Marcha" OR "Contactor_KM1") AND NOT "Boton_Paro" THEN
    "Contactor_KM1" := TRUE;
    "Piloto_Marcha" := TRUE;
ELSE
    "Contactor_KM1" := FALSE;
    "Piloto_Marcha" := FALSE;
END_IF;

// Temporizador de ciclo en marcha
"TON_1"(IN := "Contactor_KM1", PT := T#3s);
"Ciclo_Activo" := "TON_1".Q;
`,
  grafcetSteps: [
    { id: 0, name: 'Reposo', isInitial: true, actionTag: '', actionLabel: 'Esperando Marcha' },
    { id: 1, name: 'Motor ON', isInitial: false, actionTag: '%Q0.0', actionLabel: 'Activar -KM1' }
  ],
  grafcetTransitions: [
    { id: 1, fromStep: 0, toStep: 1, condition: '%I0.0 AND NOT %I0.1', label: 'Marcha (%I0.0)' },
    { id: 2, fromStep: 1, toStep: 0, condition: '%I0.1', label: 'Paro (%I0.1)' }
  ]
};

export function createInitialRuntime(program: TiaProgramDocument): TiaRuntimeState {
  const activeSteps = program.grafcetSteps.filter(s => s.isInitial).map(s => s.id);
  return {
    inputs: {},
    outputs: {},
    memory: {},
    forcedInputs: {},
    timers: {},
    counters: {},
    activeSteps: activeSteps.length > 0 ? activeSteps : [0],
    rungPowerFlow: {},
    elementPowerFlow: {},
    sclWatch: {},
    sclErrors: [],
    scanCount: 0,
    gemmaMode: 'AU',
    emergencyStop: false,
    rearmPulse: false,
    cyclePulse: false,
    stepPulse: false,
    gemmaStateCode: 'A1'
  };
}

// Normaliza nombres simbólicos o direcciones (%I0.0, "Boton_Marcha") a clave canónica
export function resolveAddress(ref: string, tags: TiaTag[]): string {
  const clean = ref.trim().replace(/^["']|["']$/g, '');
  if (!clean) return '';
  if (clean.startsWith('%')) return clean.toUpperCase();
  if (/^[IQM]\d+\.\d+$/i.test(clean)) return `%${clean.toUpperCase()}`;
  const found = tags.find(t => t.name.toLowerCase() === clean.toLowerCase());
  return found ? found.address.toUpperCase() : clean;
}

function readOperand(
  ref: string,
  state: { inputs: Record<string, boolean>; outputs: Record<string, boolean>; memory: Record<string, boolean>; timers: Record<string, TiaTimerRuntime>; counters: Record<string, TiaCounterRuntime> },
  tags: TiaTag[]
): boolean {
  const clean = ref.trim().replace(/^["']|["']$/g, '');
  if (!clean) return false;
  if (clean.toUpperCase() === 'TRUE' || clean === '1') return true;
  if (clean.toUpperCase() === 'FALSE' || clean === '0') return false;

  // Acceso a Timer .Q (ej: T1.Q, "TON_1".Q)
  const timerMatch = clean.match(/^"?([A-Za-z0-9_]+)"?\.Q$/i);
  if (timerMatch) {
    const tName = timerMatch[1];
    return Boolean(state.timers[tName]?.q || state.counters[tName]?.q);
  }

  const addr = resolveAddress(clean, tags);
  if (addr.startsWith('%I')) return Boolean(state.inputs[addr]);
  if (addr.startsWith('%Q')) return Boolean(state.outputs[addr]);
  if (addr.startsWith('%M')) return Boolean(state.memory[addr]);
  return Boolean(state.memory[addr] || state.outputs[addr] || state.inputs[addr]);
}

function writeOperand(
  ref: string,
  val: boolean,
  state: { outputs: Record<string, boolean>; memory: Record<string, boolean> },
  tags: TiaTag[]
) {
  const addr = resolveAddress(ref, tags);
  if (!addr) return;
  if (addr.startsWith('%Q')) {
    state.outputs[addr] = val;
  } else {
    state.memory[addr] = val;
  }
}

// ============================================================================
// Evaluador de Expresiones Booleanas IEC 61131-3 (para SCL y Transiciones)
// ============================================================================
function evaluateBooleanExpr(
  expr: string,
  state: { inputs: Record<string, boolean>; outputs: Record<string, boolean>; memory: Record<string, boolean>; timers: Record<string, TiaTimerRuntime>; counters: Record<string, TiaCounterRuntime> },
  tags: TiaTag[]
): boolean {
  // Tokenize: (, ), <>, =, NOT, AND, XOR, OR, identifiers/strings
  const tokenRegex = /"[^"]+"|%[IQM]\d+\.\d+|[A-Za-z_][A-Za-z0-9_]*\.Q|[A-Za-z_][A-Za-z0-9_]*|\(|\)|<>|=|AND|OR|XOR|NOT|&|\|/gi;
  const rawTokens = expr.match(tokenRegex) || [];
  let pos = 0;

  const peek = () => rawTokens[pos];
  const consume = () => rawTokens[pos++];

  function parseOr(): boolean {
    let left = parseXor();
    while (peek() && (peek().toUpperCase() === 'OR' || peek() === '|')) {
      consume();
      const right = parseXor();
      left = left || right;
    }
    return left;
  }

  function parseXor(): boolean {
    let left = parseAnd();
    while (peek() && peek().toUpperCase() === 'XOR') {
      consume();
      const right = parseAnd();
      left = left !== right;
    }
    return left;
  }

  function parseAnd(): boolean {
    let left = parseComparison();
    while (peek() && (peek().toUpperCase() === 'AND' || peek() === '&')) {
      consume();
      const right = parseComparison();
      left = left && right;
    }
    return left;
  }

  function parseComparison(): boolean {
    let left = parseUnary();
    while (peek() === '=' || peek() === '<>') {
      const op = consume();
      const right = parseUnary();
      left = op === '=' ? left === right : left !== right;
    }
    return left;
  }

  function parseUnary(): boolean {
    if (peek() && peek().toUpperCase() === 'NOT') {
      consume();
      return !parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): boolean {
    const tok = peek();
    if (!tok) return false;
    if (tok === '(') {
      consume();
      const val = parseOr();
      if (peek() === ')') consume();
      return val;
    }
    consume();
    return readOperand(tok, state, tags);
  }

  return parseOr();
}

// ============================================================================
// Compilador y Ejecutor en Vivo de SCL (Structured Control Language)
// ============================================================================
function parsePresetTime(ptStr: string): number {
  const clean = ptStr.trim().toUpperCase();
  const msMatch = clean.match(/T#(\d+(?:\.\d+)?)MS/);
  if (msMatch) return parseFloat(msMatch[1]) / 1000;
  const sMatch = clean.match(/T#(\d+(?:\.\d+)?)S/);
  if (sMatch) return parseFloat(sMatch[1]);
  const num = parseFloat(clean);
  return isNaN(num) ? 1.0 : num;
}

export function executeSclCode(
  sclCode: string,
  state: {
    inputs: Record<string, boolean>;
    outputs: Record<string, boolean>;
    memory: Record<string, boolean>;
    timers: Record<string, TiaTimerRuntime>;
    counters: Record<string, TiaCounterRuntime>;
  },
  tags: TiaTag[],
  dtSec: number
): { errors: TiaSclError[]; watch: Record<string, string> } {
  const errors: TiaSclError[] = [];
  const watch: Record<string, string> = {};

  // Strip multi-line block comments (* ... *) preserving line numbers before splitting lines
  const withoutBlockComments = sclCode.replace(/\(\*[\s\S]*?\*\)/g, match =>
    match.replace(/[^\r\n]/g, '')
  );
  const lines = withoutBlockComments.split(/\r?\n/);

  interface BlockFrame {
    active: boolean;       // Si esta rama IF está ejecutándose
    branchTaken: boolean;  // Si alguna rama del IF/ELSIF ya fue verdadera
    parentActive: boolean;
  }
  const stack: BlockFrame[] = [];
  const isExecuting = () => stack.every(f => f.active);

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i].replace(/\/\/.*$/, '').trim();
    if (!line) continue;

    // Ignorar encabezados y regiones si el usuario pegó un bloque SCL completo de TIA
    if (/^(ORGANIZATION_BLOCK|FUNCTION_BLOCK|FUNCTION|TITLE|VAR_INPUT|VAR_OUTPUT|VAR_TEMP|VAR|END_VAR|BEGIN|END_ORGANIZATION_BLOCK|END_FUNCTION_BLOCK|END_FUNCTION|VERSION|REGION\b|END_REGION\b)/i.test(line)) {
      continue;
    }

    // IF <cond> THEN
    const ifMatch = line.match(/^IF\s+(.+)\s+THEN$/i);
    if (ifMatch) {
      const parentActive = isExecuting();
      const cond = parentActive ? evaluateBooleanExpr(ifMatch[1], state, tags) : false;
      stack.push({ active: parentActive && cond, branchTaken: cond, parentActive });
      continue;
    }

    // ELSIF <cond> THEN
    const elsifMatch = line.match(/^ELSIF\s+(.+)\s+THEN$/i);
    if (elsifMatch) {
      const top = stack[stack.length - 1];
      if (!top) {
        errors.push({ line: lineNum, message: 'ELSIF sin IF correspondiente' });
        continue;
      }
      if (!top.branchTaken && top.parentActive) {
        const cond = evaluateBooleanExpr(elsifMatch[1], state, tags);
        top.active = cond;
        if (cond) top.branchTaken = true;
      } else {
        top.active = false;
      }
      continue;
    }

    // ELSE
    if (/^ELSE$/i.test(line)) {
      const top = stack[stack.length - 1];
      if (!top) {
        errors.push({ line: lineNum, message: 'ELSE sin IF correspondiente' });
        continue;
      }
      top.active = top.parentActive && !top.branchTaken;
      top.branchTaken = true;
      continue;
    }

    // END_IF;
    if (/^END_IF\s*;?$/i.test(line)) {
      if (stack.length === 0) {
        errors.push({ line: lineNum, message: 'END_IF sin bloque IF abierto' });
      } else {
        stack.pop();
      }
      continue;
    }

    if (!isExecuting()) continue;

    // Llamada a Temporizador: "TON_1"(IN := expr, PT := T#3s);
    const timerCallMatch = line.match(/^"?([A-Za-z0-9_]+)"?\s*\(\s*IN\s*:=\s*(.+?)\s*,\s*PT\s*:=\s*([^)]+)\)\s*;?$/i);
    if (timerCallMatch) {
      const tName = timerCallMatch[1];
      const inVal = evaluateBooleanExpr(timerCallMatch[2], state, tags);
      const pt = parsePresetTime(timerCallMatch[3]);
      const prev = state.timers[tName] || { inState: false, et: 0, pt, q: false };

      let et = prev.et;
      let q = false;
      if (inVal) {
        et = Math.min(pt, prev.et + dtSec);
        q = et >= pt;
      } else {
        et = 0;
        q = false;
      }
      state.timers[tName] = { inState: inVal, et, pt, q };
      watch[tName] = `Q=${q ? 'TRUE' : 'FALSE'} (${et.toFixed(1)}s/${pt}s)`;
      continue;
    }

    // Asignación booleana: "Target" := Expr;
    const assignMatch = line.match(/^("?[A-Za-z0-9_%.\s]+"?)\s*:=\s*(.+?)\s*;?$/);
    if (assignMatch) {
      const target = assignMatch[1].trim();
      const expr = assignMatch[2].trim();
      const val = evaluateBooleanExpr(expr, state, tags);
      writeOperand(target, val, state, tags);
      const cleanName = target.replace(/^["']|["']$/g, '');
      watch[cleanName] = val ? 'TRUE' : 'FALSE';
      continue;
    }

    errors.push({ line: lineNum, message: `Instrucción no reconocida: "${line}"` });
  }

  if (stack.length > 0) {
    errors.push({ line: lines.length, message: 'Falta cerrar bloque con END_IF;' });
  }

  // Agregar resumen de entradas/salidas al watch
  for (const tag of tags) {
    const val = readOperand(tag.address, state, tags);
    watch[tag.name] = val ? 'TRUE' : 'FALSE';
  }

  return { errors, watch };
}

// ============================================================================
// Ciclo de Scan Completo S7-1200 (LAD / SCL / GRAFCET)
// ============================================================================
export function stepTiaScanCycle(
  program: TiaProgramDocument,
  physicalInputs: Record<string, boolean>,
  prevRuntime: TiaRuntimeState,
  deltaMs: number
): TiaRuntimeState {
  const dtSec = Math.max(0.001, deltaMs / 1000);

  const gemmaMode: GemmaMode = prevRuntime.gemmaMode || 'AU';
  const emergencyStop = Boolean(prevRuntime.emergencyStop);
  const rearmPulse = Boolean(prevRuntime.rearmPulse);
  const cyclePulse = Boolean(prevRuntime.cyclePulse);
  const stepPulse = Boolean(prevRuntime.stepPulse);

  // 1. Imagen de Proceso de Entradas (PII): Físicas OR Forzadas + Señales GEMMA
  const inputs: Record<string, boolean> = {};
  for (const k of Object.keys(physicalInputs)) {
    inputs[k.toUpperCase()] = physicalInputs[k];
  }
  for (const k of Object.keys(prevRuntime.forcedInputs)) {
    if (prevRuntime.forcedInputs[k]) {
      inputs[k.toUpperCase()] = true;
    }
  }

  const physI83 = physicalInputs['%I8.3'] ?? physicalInputs['%i8.3'];
  const physI84 = physicalInputs['%I8.4'] ?? physicalInputs['%i8.4'];
  inputs['%I8.0'] = gemmaMode === 'MAN' || Boolean(inputs['%I8.0']);
  inputs['%I8.1'] = cyclePulse || Boolean(inputs['%I8.1']);
  inputs['%I8.2'] = stepPulse || Boolean(inputs['%I8.2']);
  inputs['%I8.3'] = emergencyStop ? false : (physI83 !== undefined ? physI83 : (inputs['%I8.3'] ?? true));
  inputs['%I8.4'] = rearmPulse ? false : (physI84 !== undefined ? physI84 : (inputs['%I8.4'] ?? true));
  inputs['%I8.5'] = gemmaMode === 'CL' || Boolean(inputs['%I8.5']);
  inputs['%I8.6'] = gemmaMode === 'ET' || Boolean(inputs['%I8.6']);
  if (emergencyStop) {
    inputs['%I0.1'] = true;
  }

  const outputs: Record<string, boolean> = { ...prevRuntime.outputs };
  const memory: Record<string, boolean> = { ...prevRuntime.memory };
  const timers: Record<string, TiaTimerRuntime> = { ...prevRuntime.timers };
  const counters: Record<string, TiaCounterRuntime> = { ...prevRuntime.counters };
  const rungPowerFlow: Record<string, boolean> = {};
  const elementPowerFlow: Record<string, boolean> = {};
  let activeSteps = [...prevRuntime.activeSteps];
  let sclWatch: Record<string, string> = {};
  let sclErrors: TiaSclError[] = [];

  // Al soltar PE, limpiar indicador rojo previo salvo que el programa lo reactive
  if (!emergencyStop && prevRuntime.emergencyStop) {
    outputs['%Q8.4'] = false;
  }

  // Rearme GEMMA (A6): limpia salidas, memorias, temporizadores y retorna a etapas iniciales
  if (rearmPulse && !emergencyStop) {
    for (const k of Object.keys(outputs)) outputs[k] = false;
    for (const k of Object.keys(memory)) memory[k] = false;
    for (const k of Object.keys(timers)) delete timers[k];
    const initSteps = program.grafcetSteps.filter(s => s.isInitial).map(s => s.id);
    activeSteps = initSteps.length > 0 ? initSteps : [0];
  }

  const evalCtx = { inputs, outputs, memory, timers, counters };

  if (program.activeLanguage === 'LAD') {
    for (const rung of program.rungs) {
      let branchResult = rung.branches.length === 0;

      // Evaluar ramas paralelas (OR)
      for (const branch of rung.branches) {
        let branchPower: boolean = true;
        for (const contact of branch.contacts) {
          const opVal = readOperand(contact.address, evalCtx, program.tags);
          const passes = contact.type === 'NO' ? opVal : !opVal;
          const contactActive: boolean = branchPower && passes;
          elementPowerFlow[contact.id] = contactActive;
          branchPower = contactActive;
        }
        if (branchPower) branchResult = true;
      }

      // Evaluar contactos en serie después de ramas
      let currentPower: boolean = branchResult;
      for (const contact of rung.seriesContacts) {
        const opVal = readOperand(contact.address, evalCtx, program.tags);
        const passes = contact.type === 'NO' ? opVal : !opVal;
        const contactActive: boolean = currentPower && passes;
        elementPowerFlow[contact.id] = contactActive;
        currentPower = contactActive;
      }

      // Evaluar temporizador si el rung tiene uno (TON / TOF)
      if (rung.timer) {
        const tm = rung.timer;
        const prev = timers[tm.name] || { inState: false, et: 0, pt: tm.presetSeconds, q: false };
        let et = prev.et;
        let q = false;

        if (tm.type === 'TON') {
          if (currentPower) {
            et = Math.min(tm.presetSeconds, prev.et + dtSec);
            q = et >= tm.presetSeconds;
          } else {
            et = 0;
            q = false;
          }
        } else {
          // TOF (Retardo a la desconexión)
          if (currentPower) {
            et = 0;
            q = true;
          } else if (prev.inState || (prev.q && prev.et < tm.presetSeconds)) {
            et = Math.min(tm.presetSeconds, prev.et + dtSec);
            q = et < tm.presetSeconds;
          } else {
            et = tm.presetSeconds;
            q = false;
          }
        }
        timers[tm.name] = { inState: currentPower, et, pt: tm.presetSeconds, q };
        elementPowerFlow[tm.id] = q;
        currentPower = q;
      }

      // Evaluar contador CTU si existe
      if (rung.counter) {
        const ct = rung.counter;
        const prev = counters[ct.name] || { prevCu: false, cv: 0, pv: ct.presetCount, q: false };
        let cv = prev.cv;
        if (currentPower && !prev.prevCu) {
          cv += 1;
        }
        const q = cv >= ct.presetCount;
        counters[ct.name] = { prevCu: currentPower, cv, pv: ct.presetCount, q };
        elementPowerFlow[ct.id] = q;
        currentPower = q;
      }

      rungPowerFlow[rung.id] = currentPower;

      // Actualizar bobinas (Imagen de Proceso de Salidas PIQ)
      for (const coil of rung.coils) {
        elementPowerFlow[coil.id] = currentPower;
        if (coil.type === 'OUT') {
          writeOperand(coil.address, currentPower, evalCtx, program.tags);
        } else if (coil.type === 'SET' && currentPower) {
          writeOperand(coil.address, true, evalCtx, program.tags);
        } else if (coil.type === 'RESET' && currentPower) {
          writeOperand(coil.address, false, evalCtx, program.tags);
        }
      }
    }
  } else if (program.activeLanguage === 'SCL') {
    const res = executeSclCode(program.sclCode, evalCtx, program.tags, dtSec);
    sclWatch = res.watch;
    sclErrors = res.errors;
  } else if (program.activeLanguage === 'GRAFCET') {
    const initialStepIds = new Set(
      program.grafcetSteps.filter(s => s.isInitial).map(s => s.id)
    );
    const nextSteps = new Set<number>(activeSteps);

    if (!emergencyStop && !rearmPulse && gemmaMode !== 'MAN') {
      if (gemmaMode === 'ET') {
        // Etapa a Etapa: solo avanza como máximo UNA transición con pulso +1 Etapa
        if (stepPulse) {
          for (const tr of program.grafcetTransitions) {
            if (activeSteps.includes(tr.fromStep)) {
              const condMet = evaluateBooleanExpr(tr.condition, evalCtx, program.tags);
              if (condMet) {
                nextSteps.delete(tr.fromStep);
                nextSteps.add(tr.toStep);
                break;
              }
            }
          }
        }
      } else {
        for (const tr of program.grafcetTransitions) {
          if (!activeSteps.includes(tr.fromStep)) continue;
          if (
            gemmaMode === 'CL' &&
            initialStepIds.has(tr.fromStep) &&
            !cyclePulse &&
            inputs['%I0.0'] !== true
          ) {
            continue;
          }
          const condMet = evaluateBooleanExpr(tr.condition, evalCtx, program.tags);
          if (condMet) {
            nextSteps.delete(tr.fromStep);
            nextSteps.add(tr.toStep);
          }
        }
      }
    }

    activeSteps = Array.from(nextSteps);

    if (gemmaMode !== 'MAN') {
      // Primero limpiar salidas propias del GRAFCET y luego activar las de etapas activas
      for (const step of program.grafcetSteps) {
        if (step.actionTag) {
          writeOperand(step.actionTag, false, evalCtx, program.tags);
        }
      }
      for (const step of program.grafcetSteps) {
        if (step.actionTag && activeSteps.includes(step.id)) {
          writeOperand(step.actionTag, true, evalCtx, program.tags);
        }
      }
    }
  }

  // Override duro de seguridad ante Parada de Emergencia (GEMMA D1)
  if (emergencyStop) {
    for (let bit = 0; bit < 8; bit++) {
      outputs[`%Q0.${bit}`] = false;
      outputs[`%Q1.${bit}`] = false;
    }
    outputs['%Q8.0'] = false;
    outputs['%Q8.1'] = false;
    outputs['%Q8.2'] = false;
    outputs['%Q8.3'] = false;
    outputs['%Q8.4'] = true;

    if (program.activeLanguage === 'GRAFCET') {
      const hasStep32 = program.grafcetSteps.some(s => s.id === 32);
      if (hasStep32) {
        if (!activeSteps.includes(32)) {
          activeSteps = [...activeSteps, 32];
        }
      } else {
        const initSteps = program.grafcetSteps.filter(s => s.isInitial).map(s => s.id);
        activeSteps = initSteps.length > 0 ? [initSteps[0]] : [0];
      }
    }
  }

  // Calcular código de estado GEMMA activo (excluyendo pilotos de torreta %Q8.2..%Q8.4)
  const hasProdOutput = Object.entries(outputs).some(([addr, val]) => {
    const up = addr.toUpperCase();
    return val && up.startsWith('%Q') && up !== '%Q8.2' && up !== '%Q8.3' && up !== '%Q8.4';
  });
  const hasProductionActivity =
    hasProdOutput ||
    Boolean(memory['%M0.0']) ||
    activeSteps.some(s => s > 0 && s < 20);

  let gemmaStateCode: string = 'A1';
  if (emergencyStop) {
    gemmaStateCode = 'D1';
  } else if (rearmPulse) {
    gemmaStateCode = 'A6';
  } else if (gemmaMode === 'MAN') {
    gemmaStateCode = 'F4';
  } else if (gemmaMode === 'ET') {
    gemmaStateCode = 'F5';
  } else if (gemmaMode === 'CL' && hasProductionActivity) {
    gemmaStateCode = 'A2';
  } else if (hasProductionActivity) {
    gemmaStateCode = 'F1';
  }

  return {
    inputs,
    outputs,
    memory,
    forcedInputs: prevRuntime.forcedInputs,
    timers,
    counters,
    activeSteps,
    rungPowerFlow,
    elementPowerFlow,
    sclWatch,
    sclErrors,
    scanCount: prevRuntime.scanCount + 1,
    gemmaMode,
    emergencyStop,
    rearmPulse: false,
    cyclePulse: false,
    stepPulse: false,
    gemmaStateCode
  };
}

// ============================================================================
// Transpilador Automático LAD -> SCL (IEC 61131-3)
// ============================================================================
export function transpileLadderToScl(rungs: TiaLadderRung[], tags: TiaTag[]): string {
  const getSymbol = (addr: string): string => {
    const found = tags.find(t => t.address.toUpperCase() === addr.toUpperCase());
    return found ? `"${found.name}"` : addr;
  };

  const lines: string[] = [
    '// Código SCL autogenerado desde Diagrama de Contactos (LAD)',
    '// Estándar IEC 61131-3 — Compatible con Siemens TIA Portal V16 - V21',
    ''
  ];

  for (const rung of rungs) {
    lines.push(`// Network ${rung.number}: ${rung.comment}`);

    const branchExprs = rung.branches
      .filter(b => b.contacts.length > 0)
      .map(b => {
        const terms = b.contacts.map(c => {
          const sym = getSymbol(c.address);
          return c.type === 'NC' ? `NOT ${sym}` : sym;
        });
        return terms.length > 1 ? `(${terms.join(' AND ')})` : terms[0];
      });

    const orExpr = branchExprs.length > 1
      ? `(${branchExprs.join(' OR ')})`
      : (branchExprs[0] || 'TRUE');

    const seriesExprs = rung.seriesContacts.map(c => {
      const sym = getSymbol(c.address);
      return c.type === 'NC' ? `NOT ${sym}` : sym;
    });

    let fullCond = seriesExprs.length > 0 ? `${orExpr} AND ${seriesExprs.join(' AND ')}` : orExpr;

    if (rung.timer) {
      const tm = rung.timer;
      lines.push(`"${tm.name}"(IN := ${fullCond}, PT := T#${Math.round(tm.presetSeconds * 1000)}ms);`);
      fullCond = `"${tm.name}".Q`;
    }

    for (const coil of rung.coils) {
      const target = getSymbol(coil.address);
      if (coil.type === 'OUT') {
        lines.push(`${target} := ${fullCond};`);
      } else if (coil.type === 'SET') {
        lines.push(`IF ${fullCond} THEN`);
        lines.push(`    ${target} := TRUE;`);
        lines.push(`END_IF;`);
      } else if (coil.type === 'RESET') {
        lines.push(`IF ${fullCond} THEN`);
        lines.push(`    ${target} := FALSE;`);
        lines.push(`END_IF;`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
